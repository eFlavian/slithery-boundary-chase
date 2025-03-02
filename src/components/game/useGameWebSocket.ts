import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Room, RoomPlayer } from '@/types/room';

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
          setRooms(message.data.rooms);
          break;

        case 'roomCreated':
          setIsCreatingRoom(false);
          setCurrentRoom(message.data.room);
          toast.success(`Room "${message.data.room.name}" created!`);
          break;

        case 'roomJoined':
          setIsJoiningRoom(false);
          setCurrentRoom(message.data.room);
          toast.success(`Joined room "${message.data.room.name}"`);
          break;

        case 'roomUpdated':
          setCurrentRoom(message.data.room);
          if (message.data.room.players.every((player: RoomPlayer) => player.isReady)) {
            toast.info('All players are ready! Starting game...');
          }
          break;

        case 'roomError':
          setIsCreatingRoom(false);
          setIsJoiningRoom(false);
          toast.error(message.data.message);
          break;

        case 'gameStarted':
          setIsPlaying(true);
          setGameOver(false);
          toast.success('Game started!');
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

  const getRoomsList = () => {
    if (!wsRef.current || !playerId) return;

    wsRef.current.send(JSON.stringify({
      type: 'getRooms',
      playerId
    }));
  };

  const createRoom = (name: string, visibility: 'public' | 'private', maxPlayers: number) => {
    if (!wsRef.current || !playerId || !playerName) {
      toast.error('Please enter your name first');
      return;
    }

    setIsCreatingRoom(true);
    
    console.log('Creating room:', { name, visibility, maxPlayers, playerId, playerName });
    
    wsRef.current.send(JSON.stringify({
      type: 'createRoom',
      playerId,
      playerName,
      roomName: name,
      visibility,
      maxPlayers
    }));
  };

  const joinRoom = (roomId: string) => {
    if (!wsRef.current || !playerId || !playerName) {
      toast.error('Please enter your name first');
      return;
    }

    setIsJoiningRoom(true);
    
    wsRef.current.send(JSON.stringify({
      type: 'joinRoom',
      playerId,
      playerName,
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
  };

  const setPlayerReady = (isReady: boolean) => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'setReady',
      playerId,
      roomId: currentRoom.id,
      isReady
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
