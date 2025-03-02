import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Room, RoomPlayer, CreateRoomRequest } from '@/types/room';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = {
  x: number;
  y: number;
};
type FoodType = 'normal' | 'special';
type FoodItem = Position & { type: FoodType };

export const useGameWebSocket = () => {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [yellowDots, setYellowDots] = useState<Position[]>([]);
  const [portals, setPortals] = useState<Position[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimapVisible, setIsMinimapVisible] = useState(false);
  const [minimapTimeLeft, setMinimapTimeLeft] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [playerName, setPlayerName] = useState('');
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const minimapTimerRef = useRef<number>();
  const minimapBlinkRef = useRef<number>();
  const reconnectTimerRef = useRef<number>();
  const countdownIntervalRef = useRef<number>();
  const isConnected = useRef<boolean>(false);

  const connectToServer = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const wsUrl = `${protocol}//${wsHost}`;
    
    console.log(`Connecting to WebSocket server at: ${wsUrl}`);
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to server');
      toast.success('Connected to game server');
      setReconnectAttempts(0);
      isConnected.current = true;
      
      // If we have a player name, re-authenticate after reconnection
      if (playerName) {
        console.log("Re-authenticating as", playerName);
        ws.send(JSON.stringify({
          type: 'authenticate',
          playerName
        }));
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);

      switch (message.type) {
        case 'init':
          setPlayerId(message.data.playerId);
          break;

        case 'gameState':
          setPlayers(message.data.players);
          setFoods(message.data.foods);
          setYellowDots(message.data.yellowDots || []);
          setPortals(message.data.portals);
          break;

        case 'playerDeath':
          toast(message.data.message);
          break;

        case 'gameOver':
          setGameOver(true);
          setIsPlaying(false);
          setIsMinimapVisible(false);
          if (minimapTimerRef.current) {
            clearTimeout(minimapTimerRef.current);
          }
          if (minimapBlinkRef.current) {
            clearInterval(minimapBlinkRef.current);
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          toast.error(`Game Over! ${message.data.message}`);
          break;
          
        case 'minimapUpdate':
          if (message.data.reset) {
            if (minimapTimerRef.current) {
              clearTimeout(minimapTimerRef.current);
            }
            if (minimapBlinkRef.current) {
              clearInterval(minimapBlinkRef.current);
            }
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
          }
          
          setIsMinimapVisible(message.data.visible);
          setMinimapTimeLeft(message.data.duration);
          
          let timeLeft = message.data.duration;
          
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          
          countdownIntervalRef.current = window.setInterval(() => {
            timeLeft -= 1;
            setMinimapTimeLeft(timeLeft);
            
            if (timeLeft === 3) {
              if (minimapBlinkRef.current) {
                clearInterval(minimapBlinkRef.current);
              }
              
              let isVisible = true;
              minimapBlinkRef.current = window.setInterval(() => {
                isVisible = !isVisible;
                setIsMinimapVisible(isVisible);
              }, 500);
            }
            
            if (timeLeft <= 0) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
            }
          }, 1000);
          
          minimapTimerRef.current = window.setTimeout(() => {
            setIsMinimapVisible(false);
            if (minimapBlinkRef.current) {
              clearInterval(minimapBlinkRef.current);
            }
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
          }, message.data.duration * 1000);
          break;

        case 'roomsList':
          console.log("Received rooms list:", message.data.rooms);
          setRooms(message.data.rooms);
          break;

        case 'roomCreated':
          console.log("Room created:", message.data.room);
          setIsCreatingRoom(false);
          setCurrentRoom(message.data.room);
          toast.success(`Room "${message.data.room.name}" created!`);
          break;

        case 'roomJoined':
          console.log("Joined room:", message.data.room);
          setIsJoiningRoom(false);
          setCurrentRoom(message.data.room);
          toast.success(`Joined room "${message.data.room.name}"`);
          break;

        case 'roomUpdated':
          console.log("Room updated:", message.data.room);
          setCurrentRoom(message.data.room);
          if (message.data.room.players.every((player: RoomPlayer) => player.isReady)) {
            toast.info('All players are ready! Starting game soon...');
          }
          break;

        case 'roomError':
          console.error("Room error:", message.data.message);
          setIsCreatingRoom(false);
          setIsJoiningRoom(false);
          toast.error(message.data.message);
          break;

        case 'gameStarted':
          setIsPlaying(true);
          setGameOver(false);
          setCurrentRoom(null); // Clear current room after game starts
          toast.success('Game started!');
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      toast.error('Disconnected from game server');
      isConnected.current = false;
      
      if (reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Attempting to reconnect in ${delay/1000} seconds...`);
        
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        
        reconnectTimerRef.current = window.setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectToServer();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [playerName, reconnectAttempts]);

  const sendDirection = (direction: Direction) => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'direction',
      direction,
      playerId
    }));
  };

  const sendUpdate = () => {
    if (!wsRef.current || !playerId || gameOver) return;

    wsRef.current.send(JSON.stringify({
      type: 'update',
      playerId
    }));
  };

  const sendSpeedBoost = () => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'speedBoost',
      playerId
    }));
  };

  const startGame = (name: string) => {
    if (!wsRef.current || !playerId) return;
    
    setPlayerName(name);
    
    wsRef.current.send(JSON.stringify({
      type: 'spawn',
      playerName: name,
      playerId
    }));
    
    setIsPlaying(true);
  };

  const getRoomsList = useCallback(() => {
    if (!wsRef.current || !isConnected.current) {
      console.warn("Cannot get rooms list: not connected");
      return;
    }

    console.log("Requesting rooms list");
    wsRef.current.send(JSON.stringify({
      type: 'getRooms'
    }));
  }, []);

  const createRoom = useCallback((name: string, visibility: 'public' | 'private', maxPlayers: number) => {
    if (!wsRef.current || !playerId || !playerName) {
      toast.error('Connection not established or player not ready');
      return;
    }

    if (!isConnected.current) {
      toast.error('Not connected to server');
      return;
    }

    setIsCreatingRoom(true);
    
    console.log('Creating room:', { name, visibility, maxPlayers, playerId, playerName });
    
    const createRoomRequest: CreateRoomRequest = {
      type: 'createRoom',
      playerId,
      playerName,
      roomName: name,
      visibility,
      maxPlayers
    };
    
    wsRef.current.send(JSON.stringify(createRoomRequest));
  }, [playerId, playerName]);

  const joinRoom = useCallback((roomId: string) => {
    if (!wsRef.current || !playerId || !playerName) {
      toast.error('Connection not established or player not ready');
      return;
    }

    if (!isConnected.current) {
      toast.error('Not connected to server');
      return;
    }

    setIsJoiningRoom(true);
    
    console.log("Joining room:", roomId);
    wsRef.current.send(JSON.stringify({
      type: 'joinRoom',
      playerId,
      playerName,
      roomId
    }));
  }, [playerId, playerName]);

  const leaveRoom = useCallback(() => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    console.log("Leaving room:", currentRoom.id);
    wsRef.current.send(JSON.stringify({
      type: 'leaveRoom',
      playerId,
      roomId: currentRoom.id
    }));
    
    setCurrentRoom(null);
  }, [playerId, currentRoom]);

  const setPlayerReady = useCallback((isReady: boolean) => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    console.log("Setting player ready:", isReady);
    wsRef.current.send(JSON.stringify({
      type: 'setReady',
      playerId,
      roomId: currentRoom.id,
      isReady
    }));
  }, [playerId, currentRoom]);

  useEffect(() => {
    connectToServer();
    
    return () => {
      wsRef.current?.close();
      if (minimapTimerRef.current) {
        clearTimeout(minimapTimerRef.current);
      }
      if (minimapBlinkRef.current) {
        clearInterval(minimapBlinkRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [connectToServer]);

  return {
    playerId,
    players,
    foods,
    yellowDots,
    portals,
    gameOver,
    isPlaying,
    isMinimapVisible,
    minimapTimeLeft,
    playerName,
    setPlayerName,
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startGame,
    setGameOver,
    setIsPlaying,
    
    rooms,
    currentRoom,
    isCreatingRoom,
    isJoiningRoom,
    getRoomsList,
    createRoom,
    joinRoom,
    leaveRoom,
    setPlayerReady
  };
};

export default useGameWebSocket;
