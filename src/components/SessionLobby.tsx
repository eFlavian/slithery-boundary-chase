
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
  const allReady = sessionState?.players.every(p => p.isReady) || false;
  const [countdown, setCountdown] = useState<number | null>(null);

  // Watch for all players ready condition
  useEffect(() => {
    if (sessionState && allReady && isHost && !sessionState.gameStarted) {
      // Host sends start game signal when all players are ready
      wsConnection?.send(JSON.stringify({
        type: 'startGame',
        playerId
      }));
      
      toast({
        title: "All players ready!",
        description: "Starting game in 3 seconds...",
      });
    }
  }, [allReady, isHost, playerId, sessionState, wsConnection, toast]);

  // Watch for game started state
  useEffect(() => {
    if (sessionState?.gameStarted) {
      // Start countdown when game is marked as started
      setCountdown(3);
    }
  }, [sessionState?.gameStarted]);

  // Handle countdown timer
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // When countdown reaches 0, trigger game start
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
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium">Your Name</span>
            <div className="flex items-center space-x-2">
              <Input 
                value={localName} 
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Enter your name" 
                className="w-full"
              />
              <Button onClick={updateName} size="sm">Update</Button>
            </div>
          </div>
        </div>

        {isHost && (
          <div className="flex items-center space-x-2">
            <Switch 
              id="public-mode"
              checked={sessionState.isPublic}
              onCheckedChange={togglePrivacy}
            />
            <label htmlFor="public-mode" className="text-sm font-medium cursor-pointer">
              {sessionState.isPublic ? "Public Lobby" : "Private Lobby"}
            </label>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Players ({sessionState.players.length})</h3>
          <div className="border rounded-md divide-y">
            {sessionState.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between p-2">
                <div className="flex items-center">
                  <span className="font-medium">
                    {player.name} 
                    {player.id === playerId && " (You)"}
                    {player.id === sessionState.host && " (Host)"}
                  </span>
                </div>
                <div className={`text-sm ${player.isReady ? "text-green-500" : "text-gray-400"}`}>
                  {player.isReady ? "Ready" : "Not Ready"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {countdown !== null && (
          <div className="bg-blue-100 p-3 rounded-md text-center">
            <p>Game starting in: <span className="font-bold text-xl">{countdown}</span> seconds</p>
          </div>
        )}

        {allReady && !sessionState.gameStarted && (
          <div className="bg-green-100 p-3 rounded-md text-center">
            <p>All players ready! {isHost ? "Starting game soon..." : "Waiting for host to start..."}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={leaveSession}>
          Leave Lobby
        </Button>
        <Button onClick={toggleReady} variant={isReady ? "outline" : "default"}>
          {isReady ? "Not Ready" : "Ready"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SessionLobby;
