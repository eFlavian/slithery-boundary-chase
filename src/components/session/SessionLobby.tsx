import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import PlayerInfo from "./PlayerInfo";
import LobbyPrivacyToggle from "./LobbyPrivacyToggle";
import PlayersList from "./PlayersList";
import GameStartingStatus from "./GameStartingStatus";
import LobbyFooter from "./LobbyFooter";
import { SessionState } from "./useSessionState";

interface SessionLobbyProps {
  playerId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  sessionState: SessionState | null;
  wsConnection: WebSocket | null;
  onGameStart: () => void;
}

const SessionLobby: React.FC<SessionLobbyProps> = ({
  playerId,
  playerName,
  setPlayerName,
  sessionState,
  wsConnection,
  onGameStart,
}) => {
  const [localName, setLocalName] = useState(playerName);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isHost = sessionState?.host === playerId;
  const isReady = sessionState?.players.find(p => p.id === playerId)?.isReady || false;
  const allPlayersReady = sessionState?.players.every(p => p.isReady) || false;
  const hasMultiplePlayers = sessionState?.players.length > 1 || false;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameStarting, setGameStarting] = useState(false);

  // Immediately trigger game start if the server says the game started
  useEffect(() => {
    if (sessionState?.gameStarted) {
      console.log("IMPORTANT: Server says game already started - IMMEDIATE force start");
      onGameStart();
    }
  }, [sessionState?.gameStarted, onGameStart]);

  // Watch for all players ready condition
  useEffect(() => {
    if (
      sessionState && 
      allPlayersReady && 
      isHost && 
      !sessionState.gameStarted && 
      !gameStarting && 
      hasMultiplePlayers
    ) {
      console.log("All players ready and multiple players present, starting countdown");
      // Host sends start game signal when all players are ready
      wsConnection?.send(JSON.stringify({
        type: 'startGame',
        playerId
      }));
      
      toast({
        title: "All players ready!",
        description: "Starting game in 3 seconds...",
      });
      
      // Start the countdown immediately when all players are ready
      setGameStarting(true);
      setCountdown(3);
    }
  }, [allPlayersReady, isHost, playerId, sessionState, wsConnection, toast, gameStarting, hasMultiplePlayers]);

  // Handle countdown timer
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      console.log("CRITICAL: Countdown reached 0 - DIRECTLY starting game");
      // Force game to start immediately when countdown reaches 0
      onGameStart();
    }
  }, [countdown, onGameStart]);

  const updateName = () => {
    if (localName.trim() && localName !== playerName) {
      setPlayerName(localName);
      wsConnection?.send(JSON.stringify({
        type: 'setName',
        playerId,
        name: localName
      }));
    }
  };

  const toggleReady = () => {
    wsConnection?.send(JSON.stringify({
      type: 'toggleReady',
      playerId
    }));
  };

  const togglePrivacy = () => {
    if (isHost) {
      wsConnection?.send(JSON.stringify({
        type: 'togglePrivacy',
        playerId
      }));
    }
  };

  const leaveSession = () => {
    wsConnection?.send(JSON.stringify({
      type: 'leaveSession',
      playerId
    }));
    navigate('/');
  };

  const copyInviteCode = () => {
    if (sessionState?.joinCode) {
      navigator.clipboard.writeText(sessionState.joinCode);
      toast({
        title: "Invite code copied!",
        description: "Share this code with your friends so they can join your game.",
      });
    }
  };

  // Emergency start game function for debugging
  const emergencyStartGame = () => {
    console.log("EMERGENCY: Manual game start triggered by user");
    onGameStart();
  };

  if (!sessionState) {
    return <div>Loading lobby...</div>;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Game Lobby</CardTitle>
        <CardDescription>
          Join Code: <span className="font-bold">{sessionState.joinCode}</span>
          <Button variant="outline" size="sm" className="ml-2" onClick={copyInviteCode}>
            Copy
          </Button>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PlayerInfo
          playerName={playerName}
          setLocalName={setLocalName}
          localName={localName}
          updateName={updateName}
        />

        <LobbyPrivacyToggle
          isHost={isHost}
          isPublic={sessionState.isPublic}
          togglePrivacy={togglePrivacy}
        />

        <PlayersList
          players={sessionState.players}
          currentPlayerId={playerId}
          hostId={sessionState.host}
        />

        <GameStartingStatus
          countdown={countdown}
          gameStarted={sessionState.gameStarted}
          isHost={isHost}
          allPlayersReady={allPlayersReady}
          hasMultiplePlayers={hasMultiplePlayers}
          gameStarting={gameStarting}
          emergencyStartGame={emergencyStartGame}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <LobbyFooter
          leaveSession={leaveSession}
          toggleReady={toggleReady}
          isReady={isReady}
        />
      </CardFooter>
    </Card>
  );
};

export default SessionLobby;
