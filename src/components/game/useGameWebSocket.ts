import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

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
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLobbyPrivate, setIsLobbyPrivate] = useState(false);
  const [publicSessions, setPublicSessions] = useState<any[]>([]);
  const [inLobby, setInLobby] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const minimapTimerRef = useRef<number>();
  const minimapBlinkRef = useRef<number>();
  const reconnectTimerRef = useRef<number>();
  const countdownIntervalRef = useRef<number>();

  const connectToServer = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFromUrl = urlParams.get('session');
    
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
      
      if (sessionFromUrl) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'init':
          setPlayerId(message.data.playerId);
          if (sessionFromUrl) {
            setTimeout(() => {
              joinSession(sessionFromUrl);
            }, 500);
          }
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
          setInLobby(false);
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
          
        case 'sessionCreated':
          setSessionId(message.data.sessionId);
          setIsHost(true);
          setInLobby(true);
          setIsLobbyPrivate(message.data.isPrivate);
          break;
          
        case 'sessionJoined':
          setSessionId(message.data.sessionId);
          setIsHost(message.data.isHost);
          setInLobby(true);
          setIsLobbyPrivate(message.data.isPrivate);
          toast.success(`Joined ${message.data.hostName}'s game!`);
          break;
          
        case 'sessionJoinError':
          toast.error(message.data.message);
          break;
          
        case 'sessionPlayerUpdate':
          setPlayers(message.data.players);
          break;
          
        case 'publicSessionsUpdate':
          setPublicSessions(message.data.sessions);
          break;
          
        case 'gameStarting':
          toast.success('All players ready! Game starting...');
          setIsPlaying(true);
          setInLobby(false);
          break;
          
        case 'sessionClosed':
          toast.error('The session has been closed by the host');
          setSessionId(null);
          setIsHost(false);
          setInLobby(false);
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
  
  const createSession = (isPublic: boolean) => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'createSession',
      playerId,
      isPrivate: !isPublic
    }));
  };
  
  const joinSession = (sessionId: string) => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'joinSession',
      playerId,
      sessionId
    }));
  };
  
  const setReadyStatus = (isReady: boolean) => {
    if (!wsRef.current || !playerId || !sessionId) return;
    
    setIsReady(isReady);
    wsRef.current.send(JSON.stringify({
      type: 'setReady',
      playerId,
      sessionId,
      isReady
    }));
  };
  
  const toggleLobbyPrivacy = () => {
    if (!wsRef.current || !playerId || !sessionId || !isHost) return;
    
    const newPrivacyStatus = !isLobbyPrivate;
    setIsLobbyPrivate(newPrivacyStatus);
    
    wsRef.current.send(JSON.stringify({
      type: 'setSessionPrivacy',
      playerId,
      sessionId,
      isPrivate: newPrivacyStatus
    }));
  };
  
  const leaveSession = () => {
    if (!wsRef.current || !playerId || !sessionId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'leaveSession',
      playerId,
      sessionId
    }));
    
    setSessionId(null);
    setIsHost(false);
    setInLobby(false);
  };
  
  const requestPublicSessions = () => {
    if (!wsRef.current || !playerId) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'getPublicSessions',
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
    if (!sessionId && playerId) {
      const interval = setInterval(() => {
        requestPublicSessions();
      }, 5000);
      
      requestPublicSessions();
      
      return () => clearInterval(interval);
    }
  }, [sessionId, playerId]);

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
    sessionId,
    isHost,
    isReady,
    isLobbyPrivate,
    publicSessions,
    inLobby,
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startGame,
    setGameOver,
    setIsPlaying,
    createSession,
    joinSession,
    setReadyStatus,
    toggleLobbyPrivacy,
    leaveSession,
    requestPublicSessions
  };
};

export default useGameWebSocket;
