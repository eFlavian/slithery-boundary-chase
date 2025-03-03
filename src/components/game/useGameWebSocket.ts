
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Direction } from '@/utils/gameUtils';
import { handleMessage } from './websocketHandlers';
import { Room, Player } from '@/types/gameTypes';

export const useGameWebSocket = () => {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('playerName') || '';
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [yellowDots, setYellowDots] = useState<any[]>([]);
  const [portals, setPortals] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimapVisible, setIsMinimapVisible] = useState(false);
  const [minimapTimeLeft, setMinimapTimeLeft] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Room-related state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const minimapTimerRef = useRef<number>();
  const minimapBlinkRef = useRef<number>();
  const reconnectTimerRef = useRef<number>();
  const countdownIntervalRef = useRef<number>();

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  useEffect(() => {
    if (playerId) {
      localStorage.setItem('playerId', playerId);
    }
  }, [playerId]);

  const clearTimers = () => {
    if (minimapTimerRef.current) {
      clearTimeout(minimapTimerRef.current);
    }
    if (minimapBlinkRef.current) {
      clearInterval(minimapBlinkRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

  const setupMinimapTimers = (duration: number) => {
    let timeLeft = duration;
    
    // Clear existing countdown interval if it exists
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = window.setInterval(() => {
      timeLeft -= 1;
      setMinimapTimeLeft(timeLeft);
      
      // Start blinking when 3 seconds are left
      if (timeLeft === 3) {
        // Clear any existing blink interval
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
    
    // Set timeout to stop the minimap visibility
    minimapTimerRef.current = window.setTimeout(() => {
      setIsMinimapVisible(false);
      if (minimapBlinkRef.current) {
        clearInterval(minimapBlinkRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }, duration * 1000);
  };

  const connectToServer = () => {
    // Fix for mobile: Use the current hostname instead of hardcoded localhost
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
      setIsConnected(true);
      
      // Re-join room if we were in one
      const roomId = localStorage.getItem('currentRoomId');
      if (roomId) {
        requestRoomUpdate(roomId);
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);
      
      switch (message.type) {
        case 'init':
          handleInitMessage(message);
          break;
        case 'gameState':
          handleGameStateMessage(message);
          break;
        case 'playerDeath':
          handlePlayerDeathMessage(message);
          break;
        case 'gameOver':
          handleGameOverMessage(message);
          break;
        case 'minimapUpdate':
          handleMinimapUpdateMessage(message);
          break;
        case 'roomsList':
          handleRoomsListMessage(message);
          break;
        case 'roomUpdate':
          handleRoomUpdateMessage(message);
          break;
        case 'roomError':
          handleRoomErrorMessage(message);
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      toast.error('Disconnected from game server');
      setIsConnected(false);
      
      // Attempt to reconnect with exponential backoff
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

  // Message handlers
  const handleInitMessage = (message: any) => {
    setPlayerId(message.data.playerId);
  };

  const handleGameStateMessage = (message: any) => {
    setPlayers(message.data.players);
    setFoods(message.data.foods);
    setYellowDots(message.data.yellowDots || []);
    setPortals(message.data.portals || []);
  };

  const handlePlayerDeathMessage = (message: any) => {
    toast(message.data.message);
  };

  const handleGameOverMessage = (message: any) => {
    setGameOver(true);
    setIsPlaying(false);
    setIsMinimapVisible(false);
    clearTimers();
    
    // If we were in a room, leave it
    if (currentRoom) {
      setCurrentRoom(null);
      localStorage.removeItem('currentRoomId');
    }
    
    toast.error(`Game Over! ${message.data.message}`);
  };

  const handleMinimapUpdateMessage = (message: any) => {
    // Clear any existing timers if this is a reset
    if (message.data.reset) {
      clearTimers();
    }
    
    setIsMinimapVisible(message.data.visible);
    setMinimapTimeLeft(message.data.duration);
    
    // Setup new timers
    setupMinimapTimers(message.data.duration);
  };

  const handleRoomsListMessage = (message: any) => {
    setRooms(message.data.rooms);
  };

  const handleRoomUpdateMessage = (message: any) => {
    const roomData = message.data.room;
    
    if (roomData) {
      setCurrentRoom(roomData);
      localStorage.setItem('currentRoomId', roomData.id);
      
      // Check if the game has started
      if (roomData.inProgress && !isPlaying) {
        setIsPlaying(true);
        setGameOver(false);
      }
    } else {
      // Room might have been deleted
      setCurrentRoom(null);
      localStorage.removeItem('currentRoomId');
    }
  };
  
  const handleRoomErrorMessage = (message: any) => {
    toast.error(message.data.message);
  };

  // WebSocket action methods
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

  // Room-related methods
  const refreshRooms = () => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'getRooms',
      playerId
    }));
  };

  const createRoom = (roomName: string, isPublic: boolean) => {
    if (!wsRef.current || !playerId || !playerName) return;
    
    console.log(`Creating ${isPublic ? 'public' : 'private'} room: ${roomName}`);
    
    wsRef.current.send(JSON.stringify({
      type: 'createRoom',
      roomName,
      isPublic,
      playerId,
      playerName
    }));
  };

  const joinRoom = (roomId: string) => {
    if (!wsRef.current || !playerId || !playerName) return;
    
    console.log(`Joining room: ${roomId}`);
    
    wsRef.current.send(JSON.stringify({
      type: 'joinRoom',
      roomId,
      playerId,
      playerName
    }));
  };

  const leaveRoom = () => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    console.log(`Leaving room: ${currentRoom.id}`);
    
    wsRef.current.send(JSON.stringify({
      type: 'leaveRoom',
      roomId: currentRoom.id,
      playerId
    }));
    
    setCurrentRoom(null);
    localStorage.removeItem('currentRoomId');
  };

  const toggleReady = () => {
    if (!wsRef.current || !playerId || !currentRoom) return;
    
    const currentPlayerInRoom = currentRoom.players.find(p => p.id === playerId);
    const newReadyState = !(currentPlayerInRoom?.isReady || false);
    
    console.log(`Toggling ready state to: ${newReadyState}`);
    
    wsRef.current.send(JSON.stringify({
      type: 'toggleReady',
      roomId: currentRoom.id,
      playerId,
      isReady: newReadyState
    }));
    
    // Update immediately locally for better UX
    setCurrentRoom(prevRoom => {
      if (!prevRoom) return null;
      
      return {
        ...prevRoom,
        players: prevRoom.players.map(player => 
          player.id === playerId 
            ? { ...player, isReady: newReadyState } 
            : player
        )
      };
    });
    
    // Request an immediate room update to refresh UI
    requestRoomUpdate(currentRoom.id);
  };

  const requestRoomUpdate = (roomId: string) => {
    if (!wsRef.current || !playerId) return;
    
    console.log(`Requesting room update for room: ${roomId}`);
    
    wsRef.current.send(JSON.stringify({
      type: 'getRoomUpdate',
      roomId,
      playerId
    }));
  };

  useEffect(() => {
    connectToServer();
    
    return () => {
      wsRef.current?.close();
      clearTimers();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  return {
    playerId,
    playerName,
    setPlayerName,
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
    // Room-related exports
    rooms,
    currentRoom,
    isConnected,
    refreshRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    requestRoomUpdate
  };
};

export default useGameWebSocket;
