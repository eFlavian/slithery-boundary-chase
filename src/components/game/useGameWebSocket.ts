import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = {
  x: number;
  y: number;
};
type FoodType = 'normal' | 'special';
type FoodItem = Position & { type: FoodType };
type GameMode = 'freeRide' | 'session';
type Room = {
  id: string;
  name: string;
  code: string;
  isPrivate: boolean;
  players: string[];
  createdBy: string;
  maxPlayers: number;
  gameStarted: boolean;
  readyPlayers?: string[];
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
  const [gameMode, setGameMode] = useState<GameMode>('freeRide');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState<'menu' | 'freeRide' | 'createRoom' | 'joinRoom' | 'room'>('menu');
  
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
      console.log('Received websocket message:', message);

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
          setAvailableRooms(message.data.rooms);
          break;

        case 'roomCreated':
          console.log('Room created successfully:', message.data.room);
          setCurrentRoom(message.data.room);
          setView('room');
          toast.success(`Room "${message.data.room.name}" created successfully!`);
          break;

        case 'roomJoined':
          setCurrentRoom(message.data.room);
          setView('room');
          toast.success(`Joined room "${message.data.room.name}"`);
          break;

        case 'playerJoinedRoom':
          if (currentRoom && message.data.roomId === currentRoom.id) {
            setCurrentRoom(prev => prev ? {
              ...prev,
              players: message.data.players
            } : null);
            toast.info(`${message.data.playerName} joined the room`);
          }
          break;

        case 'playerLeftRoom':
          if (currentRoom && message.data.roomId === currentRoom.id) {
            setCurrentRoom(prev => prev ? {
              ...prev,
              players: message.data.players
            } : null);
            toast(`${message.data.playerName} left the room`);
          }
          break;

        case 'playerReady':
          if (currentRoom && message.data.roomId === currentRoom.id) {
            setCurrentRoom(prev => {
              if (!prev) return null;
            
              const readyPlayers = prev.readyPlayers || [];
            
              if (!readyPlayers.includes(message.data.playerId)) {
                return {
                  ...prev,
                  readyPlayers: [...readyPlayers, message.data.playerId]
                };
              }
            
              return prev;
            });
          
            toast.info(`${message.data.playerName} is ready!`);
          }
          break;

        case 'gameStarting':
          toast.success('All players are ready! Game starting...');
          setIsPlaying(true);
          setGameOver(false);
          setView('freeRide');
          break;

        case 'error':
          toast.error(message.data.message);
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

  const startFreeRide = (playerName: string) => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'spawn',
      playerName,
      playerId
    }));
    
    setGameMode('freeRide');
    setIsPlaying(true);
    setView('freeRide');
  };

  const createRoom = (roomName: string, isPrivate: boolean, maxPlayers: number) => {
    if (!wsRef.current || !playerId) {
      toast.error("Connection to server lost. Please refresh the page.");
      return;
    }
    
    console.log(`Creating room: ${roomName}, private: ${isPrivate}, maxPlayers: ${maxPlayers}, playerName: ${window.localStorage.getItem('playerName') || 'Unknown'}`);
    
    wsRef.current.send(JSON.stringify({
      type: 'createRoom',
      playerId,
      roomName,
      isPrivate,
      maxPlayers,
      playerName: window.localStorage.getItem('playerName') || 'Unknown'
    }));
  };

  const joinRoom = (roomId: string, code?: string) => {
    if (!wsRef.current || !playerId) {
      toast.error("Connection to server lost. Please refresh the page.");
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'joinRoom',
      playerId,
      roomId,
      code
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
    setIsReady(false);
    setView('menu');
  };

  const setPlayerReady = () => {
    if (!wsRef.current || !playerId || !currentRoom) {
      toast.error("Connection to server lost. Please refresh the page.");
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'playerReady',
      playerId,
      roomId: currentRoom.id
    }));
    
    setIsReady(true);
  };

  const getRoomsList = useCallback(() => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'getRooms',
      playerId
    }));
  }, [playerId]);

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

  const handleWebSocketMessages = (data: any) => {
    const message = JSON.parse(data);
    console.log('Received websocket message:', message);

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
        setAvailableRooms(message.data.rooms);
        break;

      case 'roomCreated':
        console.log('Room created successfully:', message.data.room);
        setCurrentRoom(message.data.room);
        setView('room');
        toast.success(`Room "${message.data.room.name}" created successfully!`);
        break;

      case 'roomJoined':
        setCurrentRoom(message.data.room);
        setView('room');
        toast.success(`Joined room "${message.data.room.name}"`);
        break;

      case 'playerJoinedRoom':
        if (currentRoom && message.data.roomId === currentRoom.id) {
          setCurrentRoom(prev => prev ? {
            ...prev,
            players: message.data.players
          } : null);
          toast.info(`${message.data.playerName} joined the room`);
        }
        break;

      case 'playerLeftRoom':
        if (currentRoom && message.data.roomId === currentRoom.id) {
          setCurrentRoom(prev => prev ? {
            ...prev,
            players: message.data.players
          } : null);
          toast(`${message.data.playerName} left the room`);
        }
        break;

      case 'playerReady':
        if (currentRoom && message.data.roomId === currentRoom.id) {
          setCurrentRoom(prev => {
            if (!prev) return null;
            
            const readyPlayers = prev.readyPlayers || [];
            
            if (!readyPlayers.includes(message.data.playerId)) {
              return {
                ...prev,
                readyPlayers: [...readyPlayers, message.data.playerId]
              };
            }
            
            return prev;
          });
          
          toast.info(`${message.data.playerName} is ready!`);
        }
        break;

      case 'gameStarting':
        toast.success('All players are ready! Game starting...');
        setIsPlaying(true);
        setGameOver(false);
        setView('freeRide');
        break;

      case 'error':
        toast.error(message.data.message);
        break;
    }
  };

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
    gameMode,
    availableRooms,
    currentRoom,
    isReady,
    view,
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startFreeRide,
    createRoom,
    joinRoom,
    leaveRoom,
    setPlayerReady,
    getRoomsList,
    setGameOver,
    setIsPlaying,
    setView
  };
};

export default useGameWebSocket;
