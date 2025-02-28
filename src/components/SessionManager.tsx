
import React, { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SessionCreator from "./SessionCreator";
import SessionJoiner from "./SessionJoiner";
import { SessionWebSocket } from "./session/SessionWebSocket";
import { useSessionState } from "./session/useSessionState";
import ConnectingScreen from "./session/ConnectingScreen";
import SessionLobby from "./session/SessionLobby";

interface SessionManagerProps {
  wsUrl: string;
  onGameStart: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ wsUrl, onGameStart }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("Player");
  const [activeTab, setActiveTab] = useState<string>("create");
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null);

  // Force game start function to ensure it happens no matter what
  const forceGameStart = useCallback(() => {
    console.log("FORCE GAME START called - absolute final trigger");
    onGameStart();
  }, [onGameStart]);

  const { sessionState, handleSessionMessage, goToHome } = useSessionState(
    wsConnection,
    playerId,
    forceGameStart
  );

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log("Connection state changed:", connected);
    setIsConnected(connected);
  }, []);

  const handleInit = useCallback((newPlayerId: string) => {
    console.log("Player initialized with ID:", newPlayerId);
    setPlayerId(newPlayerId);
  }, []);

  const handleWebSocketMessage = useCallback((data: any) => {
    handleSessionMessage(data);
  }, [handleSessionMessage]);

  const handleExternalWsConnection = useCallback((ws: WebSocket | null, retry?: () => void) => {
    setWsConnection(ws);
    if (retry) setRetryFn(retry);
  }, []);

  if (!isConnected) {
    return <ConnectingScreen onRetry={retryFn || undefined} />;
  }

  if (sessionState) {
    return (
      <div className="container mx-auto p-4">
        <SessionLobby
          playerId={playerId || ""}
          playerName={playerName}
          setPlayerName={setPlayerName}
          sessionState={sessionState}
          wsConnection={wsConnection}
          onGameStart={forceGameStart}
        />
      </div>
    );
  }

  return (
    <>
      <SessionWebSocket
        wsUrl={wsUrl}
        onMessage={handleWebSocketMessage}
        onConnectionChange={handleConnectionChange}
        onInit={handleInit}
      />
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
    </>
  );
};

export default SessionManager;
