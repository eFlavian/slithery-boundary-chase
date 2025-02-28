
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import SessionCreator from "./SessionCreator";
import SessionJoiner from "./SessionJoiner";
import SessionLobby from "./SessionLobby";
import { useNavigate } from "react-router-dom";

interface Player {
  id: string;
  name: string;
  isReady: boolean;
}

interface SessionState {
  id: string;
  joinCode: string;
  host: string;
  players: Player[];
  isPublic: boolean;
  gameStarted: boolean;
}

interface SessionManagerProps {
  wsUrl: string;
  onGameStart: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ wsUrl, onGameStart }) => {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("Player");
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [activeTab, setActiveTab] = useState<string>("create");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Establish WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      
      ws.addEventListener('open', () => {
        setIsConnected(true);
        setWsConnection(ws);
        console.log("WebSocket connected successfully");
      });
      
      ws.addEventListener('close', () => {
        setIsConnected(false);
        setWsConnection(null);
        console.log("WebSocket connection closed");
        
        // Auto reconnect after delay
        setTimeout(connectWebSocket, 3000);
      });
      
      ws.addEventListener('error', (error) => {
        console.error("WebSocket error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to the game server. Retrying...",
          variant: "destructive"
        });
      });
      
      setWsConnection(ws);
    };
    
    connectWebSocket();
    
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wsUrl, toast]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);
        
        switch (data.type) {
          case 'init':
            setPlayerId(data.data.playerId);
            break;
            
          case 'sessionCreated':
          case 'sessionJoined':
            toast({
              title: data.type === 'sessionCreated' ? "Session Created!" : "Joined Session!",
              description: `Session code: ${data.data.joinCode}`
            });
            break;
            
          case 'sessionState':
            setSessionState(data.data);
            // Check if game is marked as started
            if (data.data.gameStarted) {
              console.log("Game marked as started in sessionState");
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
            console.log("Received gameStart message, starting game");
            onGameStart();
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    if (wsConnection) {
      wsConnection.addEventListener('message', handleMessage);
      return () => {
        wsConnection.removeEventListener('message', handleMessage);
      };
    }
  }, [wsConnection, toast, onGameStart]);

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

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Connecting to game server...</p>
        <Button variant="outline" disabled>Please wait</Button>
      </div>
    );
  }

  // Show session lobby if in a session
  if (sessionState) {
    return (
      <div className="container mx-auto p-4">
        <SessionLobby
          playerId={playerId || ""}
          playerName={playerName}
          setPlayerName={setPlayerName}
          sessionState={sessionState}
          wsConnection={wsConnection}
          onGameStart={onGameStart}
        />
      </div>
    );
  }

  // Show session creation/joining interface
  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="create">Create Game</TabsTrigger>
          <TabsTrigger value="join">Join Game</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <SessionCreator
            playerId={playerId || ""}
            playerName={playerName}
            setPlayerName={setPlayerName}
            wsConnection={wsConnection}
          />
        </TabsContent>
        
        <TabsContent value="join">
          <SessionJoiner
            playerId={playerId || ""}
            playerName={playerName}
            setPlayerName={setPlayerName}
            wsConnection={wsConnection}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SessionManager;
