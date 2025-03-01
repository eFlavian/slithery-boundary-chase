
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  isHost: boolean;
}

export interface SessionData {
  sessionId: string;
  playerId: string;
  players: Player[];
  isPrivate: boolean;
  countdown: number | null;
}

const useSessionWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectingAttempts, setConnectingAttempts] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number>();
  
  const connect = useCallback(() => {
    // Use the same WebSocket server as the game
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
      setIsConnected(true);
      setConnectingAttempts(0);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'sessionCreated':
        case 'sessionJoined':
        case 'sessionUpdated':
          setSessionData(message.data);
          break;
          
        case 'sessionError':
          toast.error(message.data.message);
          break;
          
        case 'gameStarting':
          setSessionData(prev => prev ? {
            ...prev,
            countdown: message.data.countdown
          } : null);
          break;
          
        case 'gameStart':
          // We'll handle the transition to the game here
          // For now, let's just clear the session data
          setSessionData(null);
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      
      // Attempt to reconnect with exponential backoff
      if (connectingAttempts < 5) {
        const nextAttempt = connectingAttempts + 1;
        setConnectingAttempts(nextAttempt);
        
        const delay = Math.min(1000 * Math.pow(2, connectingAttempts), 30000);
        console.log(`Attempting to reconnect in ${delay/1000} seconds...`);
        
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [connectingAttempts]);

  const reconnect = useCallback(() => {
    setConnectingAttempts(0);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((type: string, data: any = {}) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Not connected to server');
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type,
      ...data
    }));
  }, []);

  const createSession = useCallback((playerName: string) => {
    sendMessage('createSession', { playerName });
  }, [sendMessage]);

  const joinSession = useCallback((sessionId: string, playerName: string) => {
    sendMessage('joinSession', { sessionId, playerName });
  }, [sendMessage]);

  const leaveSession = useCallback(() => {
    if (sessionData) {
      sendMessage('leaveSession', { sessionId: sessionData.sessionId });
      setSessionData(null);
    }
  }, [sessionData, sendMessage]);

  const setReady = useCallback(() => {
    if (sessionData) {
      sendMessage('toggleReady', { sessionId: sessionData.sessionId });
    }
  }, [sessionData, sendMessage]);

  const togglePrivacy = useCallback(() => {
    if (sessionData) {
      sendMessage('togglePrivacy', { sessionId: sessionData.sessionId });
    }
  }, [sessionData, sendMessage]);

  const startGame = useCallback(() => {
    if (sessionData) {
      sendMessage('startGame', { sessionId: sessionData.sessionId });
    }
  }, [sessionData, sendMessage]);

  return {
    isConnected,
    connectingAttempts,
    sessionData,
    createSession,
    joinSession,
    leaveSession,
    setReady,
    togglePrivacy,
    startGame,
    reconnect
  };
};

export default useSessionWebSocket;
