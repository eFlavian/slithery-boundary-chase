import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = {
  x: number;
  y: number;
};
type FoodType = 'normal' | 'special';
type FoodItem = Position & { type: FoodType };

type Room = {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  host: string;
};

type Player = {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
};

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
  
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{
    id: string;
    name: string;
    isPublic: boolean;
    players: Player[];
  } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const minimapTimerRef = useRef<number>();
  const minimapBlinkRef = useRef<number>();
  const reconnectTimerRef = useRef<number>();
  const countdownIntervalRef = useRef<number>();

  const connectToServer = () => {
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
          setCurrentRoom(null);
          setIsHost(false);
          setIsReady(false);
          
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

        case 'publicRooms':
          setPublicRooms(message.data.rooms);
          break;

        case 'roomCreated':
          console.log('Room created:', message.data);
          setCurrentRoom({
            id: message.data.roomId,
            name: message.data.roomName,
            isPublic: message.data.isPublic,
            players: message.data.players
          });
          setIsHost(true);
          setIsReady(false);
          toast.success(`Room "${message.data.roomName}" created`);
          break;

        case 'roomJoined':
          setCurrentRoom({
            id: message.data.roomId,
            name: message.data.roomName,
            isPublic: message.data.isPublic,
            players: message.data.players
          });
          setIsHost(message.data.isHost);
          setIsReady(false);
          toast.success(`Joined room "${message.data.roomName}"`);
          break;

        case 'roomUpdate':
          if (currentRoom && message.data.roomId === currentRoom.id) {
            setCurrentRoom({
              ...currentRoom,
              players: message.data.players
            });
            setAllPlayersReady(message.data.allPlayersReady);
          }
          break;

        case 'playerLeft':
          if (currentRoom) {
            toast.info(`${message.data.playerName} left the room`);
          }
          break;

        case 'playerJoined':
          if (currentRoom) {
            toast.info(`${message.data.playerName} joined the room`);
          }
          break;

        case 'roomError':
          toast.error(message.data.message);
          break;

        case 'gameStarting':
          toast.success('Game starting in 3 seconds!');
          setTimeout(() => {
            setIsPlaying(true);
            setGameOver(false);
          }, 3000);
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      toast.error('Disconnected from game server');
      
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
  };

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

  const startGame = (playerName: string) => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'spawn',
      playerName,
      playerId
    }));
    
    setIsPlaying(true);
  };

  const createRoom = (roomName: string, isPublic: boolean, maxPlayers: number) => {
    if (!wsRef.current || !playerId) return;
    
    console.log('Sending createRoom request:', { roomName, isPublic, maxPlayers, playerId });
    
    wsRef.current.send(JSON.stringify({
      type: 'createRoom',
      playerId,
      roomName,
      isPublic,
      maxPlayers
    }));
  };

  const joinRoom = (roomId: string) => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'joinRoom',
      playerId,
      roomId
    }));
  };

  const leaveRoom = () => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'leaveRoom',
      playerId,
      roomId: currentRoom.id
    }));
    
    setCurrentRoom(null);
    setIsHost(false);
    setIsReady(false);
  };

  const toggleReady = () => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    const newReadyState = !isReady;
    
    wsRef.current.send(JSON.stringify({
      type: 'toggleReady',
      playerId,
      roomId: currentRoom.id,
      isReady: newReadyState
    }));
    
    setIsReady(newReadyState);
  };

  const startRoomGame = () => {
    if (!wsRef.current || !playerId || !currentRoom || !isHost || !allPlayersReady) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'startGame',
      playerId,
      roomId: currentRoom.id
    }));
  };

  const requestPublicRooms = () => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'getPublicRooms',
      playerId
    }));
  };

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
  }, []);

  useEffect(() => {
    if (playerId && !currentRoom && !isPlaying) {
      const interval = setInterval(() => {
        requestPublicRooms();
      }, 5000);
      
      requestPublicRooms();
      
      return () => clearInterval(interval);
    }
  }, [playerId, currentRoom, isPlaying]);

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
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startGame,
    setGameOver,
    setIsPlaying,
    publicRooms,
    currentRoom,
    isHost,
    isReady,
    allPlayersReady,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startRoomGame
  };
};

export default useGameWebSocket;
