import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = {
  x: number;
  y: number;
};
type FoodType = 'normal' | 'special';
type FoodItem = Position & { type: FoodType };
type SessionStatus = 'waiting' | 'playing' | 'ended';
type SessionVisibility = 'public' | 'private';

export type Session = {
  id: string;
  code: string;
  name: string;
  hostId: string;
  players: Array<{
    id: string;
    name: string;
    isReady: boolean;
  }>;
  status: SessionStatus;
  visibility: SessionVisibility;
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
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [joinCode, setJoinCode] = useState<string>('');
  
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
      console.log('Received message:', message.type, message.data);

      switch (message.type) {
        case 'init':
          setPlayerId(message.data.playerId);
          break;

        case 'gameState':
          console.log('Game state update:', message.data);
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
          
        case 'sessionsList':
          setSessions(message.data.sessions);
          break;
          
        case 'sessionCreated':
          setCurrentSession(message.data.session);
          setIsHost(true);
          setJoinCode(message.data.session.code);
          toast.success(`Session created with code: ${message.data.session.code}`);
          break;
          
        case 'sessionJoined':
          setCurrentSession(message.data.session);
          setIsHost(message.data.session.hostId === playerId);
          toast.success(`Joined session: ${message.data.session.name}`);
          break;
          
        case 'sessionUpdated':
          setCurrentSession(message.data.session);
          
          if (message.data.session.status === 'playing' && !isPlaying) {
            setIsPlaying(true);
            setGameOver(false);
            toast.success('All players ready! Game starting...');
            
            const playerNames = new Map();
            message.data.session.players.forEach(player => {
              playerNames.set(player.id, player.name);
            });
            
            if (playerId && playerNames.has(playerId)) {
              console.log('Auto-spawning player:', playerId, playerNames.get(playerId));
              startGame(playerNames.get(playerId));
            }
          }
          break;
          
        case 'playerReadyChanged':
          if (message.data.playerId === playerId) {
            setIsReady(message.data.isReady);
          }
          break;
          
        case 'sessionError':
          toast.error(message.data.message);
          break;
          
        case 'sessionClosed':
          setCurrentSession(null);
          setIsHost(false);
          setIsReady(false);
          if (isPlaying) {
            setGameOver(true);
            setIsPlaying(false);
          }
          toast.error('Session closed');
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

  const createSession = (sessionName: string, visibility: SessionVisibility = 'private') => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'createSession',
      sessionName,
      playerId,
      visibility
    }));
  };
  
  const joinSession = (code: string) => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'joinSession',
      code,
      playerId
    }));
  };
  
  const leaveSession = () => {
    if (!wsRef.current || !playerId || !currentSession) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'leaveSession',
      sessionId: currentSession.id,
      playerId
    }));
    
    setCurrentSession(null);
    setIsHost(false);
    setIsReady(false);
  };
  
  const toggleReady = () => {
    if (!wsRef.current || !playerId || !currentSession) return;
    
    const newReadyState = !isReady;
    
    wsRef.current.send(JSON.stringify({
      type: 'toggleReady',
      sessionId: currentSession.id,
      playerId,
      isReady: newReadyState
    }));
    
    setIsReady(newReadyState);
  };
  
  const toggleSessionVisibility = () => {
    if (!wsRef.current || !playerId || !currentSession || !isHost) return;
    
    const newVisibility = currentSession.visibility === 'public' ? 'private' : 'public';
    
    wsRef.current.send(JSON.stringify({
      type: 'toggleVisibility',
      sessionId: currentSession.id,
      playerId,
      visibility: newVisibility
    }));
  };
  
  const fetchSessions = () => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'getSessions',
      playerId
    }));
  };

  const startGame = (playerName: string) => {
    if (!wsRef.current || !playerId) return;
    
    console.log('Starting game with player name:', playerName);
    wsRef.current.send(JSON.stringify({
      type: 'spawn',
      playerName,
      playerId
    }));
    
    if (!currentSession) {
      setIsPlaying(true);
    }
    
    setGameOver(false);
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
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startGame,
    setGameOver,
    setIsPlaying,
    sessions,
    currentSession,
    isHost,
    isReady,
    joinCode,
    createSession,
    joinSession,
    leaveSession,
    toggleReady,
    toggleSessionVisibility,
    fetchSessions
  };
};

export default useGameWebSocket;
