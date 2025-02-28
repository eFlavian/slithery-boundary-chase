
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SessionCreatorProps {
  playerId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  wsConnection: WebSocket | null;
}

const SessionCreator: React.FC<SessionCreatorProps> = ({
  playerId,
  playerName,
  setPlayerName,
  wsConnection,
}) => {
  const [isPublic, setIsPublic] = useState(true);
  const [localName, setLocalName] = useState(playerName);

  const createSession = () => {
    if (localName.trim() && localName !== playerName) {
      setPlayerName(localName);
      wsConnection?.send(JSON.stringify({
        type: 'setName',
        playerId,
        name: localName
      }));
    }
    
    wsConnection?.send(JSON.stringify({
      type: 'createSession',
      playerId,
      isPublic
    }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Game Session</CardTitle>
        <CardDescription>
          Host a new game session for your friends to join.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="player-name">Your Name</Label>
          <Input 
            id="player-name"
            value={localName} 
            onChange={(e) => setLocalName(e.target.value)} 
            placeholder="Enter your name"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="public-mode"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          <Label htmlFor="public-mode" className="cursor-pointer">
            {isPublic ? "Public Lobby (visible to everyone)" : "Private Lobby (invite only)"}
          </Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={createSession} className="w-full">
          Create Session
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SessionCreator;
