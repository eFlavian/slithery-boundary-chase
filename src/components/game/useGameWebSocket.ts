
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
  const lastSocketMessageRef = useRef<number>(Date.now());
  const pendingRoomCreationRef = useRef<boolean>(false);
  const roomUpdateTimerRef = useRef<number>();

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
      lastSocketMessageRef.current = Date.now();
      
      if (pendingRoomCreationRef.current && playerId) {
        console.log('Reconnected with pending room creation, sending ping...');
        try {
          ws.send(JSON.stringify({
            type: 'ping',
            playerId
          }));
        } catch (error) {
          console.error('Error sending ping after reconnect:', error);
        }
      }
      
      if (currentRoom && playerId) {
        requestRoomUpdate();
      }
    };

    ws.onmessage = (event) => {
      try {
        lastSocketMessageRef.current = Date.now();
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
            const formattedRooms = message.data.rooms.map(room => ({
              ...room,
              id: room.id.startsWith('room_') ? room.id.substring(5).toUpperCase() : room.id.toUpperCase()
            }));
            setPublicRooms(formattedRooms);
            break;

          case 'roomCreated':
            console.log('Room created response received:', message.data);
            pendingRoomCreationRef.current = false;
            
            if (!message.data.roomId) {
              console.error('Invalid room data received:', message.data);
              toast.error('Error creating room: Invalid room data');
              return;
            }
            
            let roomIdToUse = message.data.roomId;
            if (roomIdToUse.startsWith('room_')) {
              roomIdToUse = roomIdToUse.substring(5).toUpperCase();
            } else {
              roomIdToUse = roomIdToUse.toUpperCase();
            }
            
            const newRoom = {
              id: roomIdToUse,
              name: message.data.roomName,
              isPublic: message.data.isPublic,
              players: message.data.players || []
            };
            
            console.log('Setting currentRoom to:', newRoom);
            setCurrentRoom(newRoom);
            setIsHost(true);
            setIsReady(false);
            
            toast.success(`Room "${message.data.roomName}" created. Room code: ${roomIdToUse}`);
            
            startRoomUpdateInterval();
            break;

          case 'roomJoined':
            const joinedRoomId = message.data.roomId.startsWith('room_') 
              ? message.data.roomId.substring(5).toUpperCase() 
              : message.data.roomId.toUpperCase();
              
            setCurrentRoom({
              id: joinedRoomId,
              name: message.data.roomName,
              isPublic: message.data.isPublic,
              players: message.data.players
            });
            setIsHost(message.data.isHost);
            setIsReady(false);
            toast.success(`Joined room "${message.data.roomName}"`);
            
            startRoomUpdateInterval();
            break;

          case 'roomUpdate':
            if (currentRoom) {
              const currentRoomIdNormalized = currentRoom.id.toUpperCase();
              const updateRoomIdNormalized = message.data.roomId.startsWith('room_')
                ? message.data.roomId.substring(5).toUpperCase()
                : message.data.roomId.toUpperCase();
                
              if (currentRoomIdNormalized === updateRoomIdNormalized) {
                setCurrentRoom({
                  ...currentRoom,
                  players: message.data.players
                });
                setAllPlayersReady(message.data.allPlayersReady);
              }
            }
            break;

          case 'playerLeft':
            if (currentRoom) {
              toast.info(`${message.data.playerName} left the room`);
              requestRoomUpdate();
            }
            break;

          case 'playerJoined':
            if (currentRoom) {
              toast.info(`${message.data.playerName} joined the room`);
              requestRoomUpdate();
            }
            break;

          case 'roomError':
            pendingRoomCreationRef.current = false;
            toast.error(message.data.message);
            break;

          case 'gameStarting':
            toast.success('Game starting in 3 seconds!');
            setTimeout(() => {
              setIsPlaying(true);
              setGameOver(false);
            }, 3000);
            break;
            
          case 'pong':
            console.log('Received pong from server');
            break;
            
          default:
            console.log('Unhandled message type:', message.type);
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error, event.data);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      toast.error('Disconnected from game server');
      
      if (roomUpdateTimerRef.current) {
        clearInterval(roomUpdateTimerRef.current);
      }
      
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
    
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - lastSocketMessageRef.current;
      
      if (timeSinceLastMessage > 30000 && !isPlaying && wsRef.current) {
        console.log(`No message received for ${timeSinceLastMessage/1000} seconds, sending ping`);
        
        try {
          if (wsRef.current.readyState === WebSocket.OPEN && playerId) {
            wsRef.current.send(JSON.stringify({
              type: 'ping',
              playerId
            }));
          }
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
      
      if (pendingRoomCreationRef.current && timeSinceLastMessage > 60000) {
        console.log('Room creation appears to have failed after 60 seconds');
        pendingRoomCreationRef.current = false;
        toast.error('Room creation timed out. The server might be unavailable.');
      }
    }, 10000);
    
    return () => {
      clearInterval(healthCheckInterval);
    };
  };

  const startRoomUpdateInterval = () => {
    if (roomUpdateTimerRef.current) {
      clearInterval(roomUpdateTimerRef.current);
    }
    
    // Set a more frequent update interval for better synchronization (1.5 seconds)
    roomUpdateTimerRef.current = window.setInterval(() => {
      requestRoomUpdate();
    }, 1500);
  };

  const requestRoomUpdate = () => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    try {
      wsRef.current.send(JSON.stringify({
        type: 'getRoomUpdate',
        playerId,
        roomId: currentRoom.id.startsWith('room_') ? 
          currentRoom.id : 
          `room_${currentRoom.id.toLowerCase()}`
      }));
    } catch (error) {
      console.error('Error requesting room update:', error);
    }
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
    if (!wsRef.current || !playerId) {
      console.error('Cannot create room: No WebSocket connection or player ID');
      toast.error('Cannot create room. Try refreshing the page.');
      return false;
    }
    
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not open, current state:', wsRef.current.readyState);
      toast.error('Connection to server not ready. Please try again in a moment.');
      return false;
    }
    
    const request = {
      type: 'createRoom',
      playerId,
      roomName,
      isPublic,
      maxPlayers,
      generateSimpleCode: true,
      simpleCodeLength: 5,
      simpleCodeFormat: 'ALPHANUMERIC_UPPER'
    };
    
    console.log('Sending createRoom request:', request);
    
    try {
      wsRef.current.send(JSON.stringify(request));
      console.log('Create room request sent successfully');
      pendingRoomCreationRef.current = true;
      
      setTimeout(() => {
        if (pendingRoomCreationRef.current) {
          pendingRoomCreationRef.current = false;
          console.log('Room creation timed out after 30 seconds');
          toast.error('Room creation request timed out. The server might be unavailable.');
        }
      }, 30000);
      
      return true;
    } catch (error) {
      console.error('Error sending createRoom request:', error);
      toast.error('Failed to create room. Please try again.');
      return false;
    }
  };

  const joinRoom = (roomId: string) => {
    if (!wsRef.current || !playerId) return;
    
    const formattedRoomId = roomId.startsWith('room_') 
      ? roomId 
      : `room_${roomId.toLowerCase()}`;
      
    console.log(`Joining room with ID: ${formattedRoomId}`);
    
    wsRef.current.send(JSON.stringify({
      type: 'joinRoom',
      playerId,
      roomId: formattedRoomId
    }));
  };

  const leaveRoom = () => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    if (roomUpdateTimerRef.current) {
      clearInterval(roomUpdateTimerRef.current);
    }
    
    const formattedRoomId = currentRoom.id.startsWith('room_')
      ? currentRoom.id
      : `room_${currentRoom.id.toLowerCase()}`;
    
    wsRef.current.send(JSON.stringify({
      type: 'leaveRoom',
      playerId,
      roomId: formattedRoomId
    }));
    
    setCurrentRoom(null);
    setIsHost(false);
    setIsReady(false);
  };

  const toggleReady = () => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    const newReadyState = !isReady;
    
    const formattedRoomId = currentRoom.id.startsWith('room_')
      ? currentRoom.id
      : `room_${currentRoom.id.toLowerCase()}`;
    
    wsRef.current.send(JSON.stringify({
      type: 'toggleReady',
      playerId,
      roomId: formattedRoomId,
      isReady: newReadyState
    }));
    
    setIsReady(newReadyState);
    
    // Request immediate update after toggling ready status
    setTimeout(() => {
      requestRoomUpdate();
    }, 100);
  };

  const startRoomGame = () => {
    if (!wsRef.current || !playerId || !currentRoom || !isHost || !allPlayersReady) return;
    
    const formattedRoomId = currentRoom.id.startsWith('room_')
      ? currentRoom.id
      : `room_${currentRoom.id.toLowerCase()}`;
    
    wsRef.current.send(JSON.stringify({
      type: 'startGame',
      playerId,
      roomId: formattedRoomId
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
    const cleanupFn = connectToServer();
    
    return () => {
      cleanupFn();
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
      if (roomUpdateTimerRef.current) {
        clearInterval(roomUpdateTimerRef.current);
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

  useEffect(() => {
    console.log('currentRoom state changed:', currentRoom);
    
    if (currentRoom && playerId) {
      // Request immediate update when room changes
      requestRoomUpdate();
      
      // Start a more frequent update interval
      startRoomUpdateInterval();
    }
  }, [currentRoom]);

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
    startRoomGame,
    requestRoomUpdate
  };
};

export default useGameWebSocket;
