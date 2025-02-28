
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
}

export interface SessionState {
  id: string;
  joinCode: string;
  host: string;
  players: Player[];
  isPublic: boolean;
  gameStarted: boolean;
}

export const useSessionState = (
  wsConnection: WebSocket | null,
  playerId: string | null,
  forceGameStart: () => void
) => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSessionMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'sessionCreated':
        toast({
          title: "Session Created!",
          description: `Session code: ${data.data.joinCode}`
        });
        if (playerId && wsConnection) {
          // Explicitly set player to not ready when creating a session
          wsConnection.send(JSON.stringify({
            type: 'setReady',
            playerId,
            isReady: false
          }));
        }
        break;
        
      case 'sessionJoined':
        toast({
          title: "Joined Session!",
          description: `Session code: ${data.data.joinCode}`
        });
        if (playerId && wsConnection) {
          // Explicitly set player to not ready when joining a session
          wsConnection.send(JSON.stringify({
            type: 'setReady',
            playerId,
            isReady: false
          }));
        }
        break;
        
      case 'sessionState':
        setSessionState(data.data);
        // Force game start if server says game has started
        if (data.data.gameStarted) {
          console.log("Game marked as started in sessionState, FORCING game start");
          forceGameStart();
        }
        break;
        
      case 'error':
        toast({
          title: "Error",
          description: data.data.message,
          variant: "destructive"
        });
        break;
        
      case 'gameStart':
        console.log("Received gameStart message, FORCING game start");
        // Force start the game when server sends gameStart
        forceGameStart();
        break;
    }
  }, [wsConnection, toast, forceGameStart, playerId]);

  const goToHome = useCallback(() => {
    if (sessionState && wsConnection && playerId) {
      wsConnection.send(JSON.stringify({
        type: 'leaveSession',
        playerId
      }));
    }
    
    setSessionState(null);
    navigate('/');
  }, [sessionState, wsConnection, playerId, navigate]);

  return {
    sessionState,
    handleSessionMessage,
    goToHome,
  };
};
