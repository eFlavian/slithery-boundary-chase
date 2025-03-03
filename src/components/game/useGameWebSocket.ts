
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { handleMessage } from './websocketHandlers';
import { Direction, GRID_SIZE } from '@/utils/gameUtils';

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
  
  // Battle Royale game states
  const [gameStatus, setGameStatus] = useState<'waiting' | 'countdown' | 'playing' | 'ended'>('waiting');
  const [countdownValue, setCountdownValue] = useState(10);
  const [gameTimeLeft, setGameTimeLeft] = useState(60);
  const [battleRoyaleRadius, setBattleRoyaleRadius] = useState(0);
  const [battleRoyaleCenter, setBattleRoyaleCenter] = useState<Position>({ x: GRID_SIZE / 2, y: GRID_SIZE / 2 });
  
  const wsRef = useRef<WebSocket | null>(null);
  const minimapTimerRef = useRef<number>();
  const minimapBlinkRef = useRef<number>();
  const reconnectTimerRef = useRef<number>();
  const countdownIntervalRef = useRef<number>();

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
    };

    ws.onmessage = (event) => {
      handleMessage(event, {
        setPlayerId,
        setPlayers,
        setFoods,
        setYellowDots,
        setPortals,
        setGameOver,
        setIsPlaying,
        setIsMinimapVisible,
        setMinimapTimeLeft,
        setGameStatus,
        setCountdownValue,
        setGameTimeLeft,
        setBattleRoyaleRadius,
        setBattleRoyaleCenter,
        clearTimers,
        setupMinimapTimers
      });
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      toast.error('Disconnected from game server');
      
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

  const sendDirection = (direction: Direction) => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'direction',
      direction,
      playerId,
      gameStatus // Send the current game status to let server know if game is active
    }));
  };

  const sendUpdate = () => {
    if (!wsRef.current || !playerId || gameOver) return;

    wsRef.current.send(JSON.stringify({
      type: 'update',
      playerId,
      gameStatus // Send the current game status to let server know if game is active
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
    players,
    foods,
    yellowDots,
    portals,
    gameOver,
    isPlaying,
    isMinimapVisible,
    minimapTimeLeft,
    gameStatus,
    countdownValue,
    gameTimeLeft,
    battleRoyaleRadius,
    battleRoyaleCenter,
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startGame,
    setGameOver,
    setIsPlaying,
    setGameStatus,
    setCountdownValue,
    setGameTimeLeft,
    setBattleRoyaleRadius,
    setBattleRoyaleCenter
  };
};

export default useGameWebSocket;
