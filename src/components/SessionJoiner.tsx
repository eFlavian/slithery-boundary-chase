
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PublicSession {
  id: string;
  joinCode: string;
  playersCount: number;
  readyCount: number;
}

interface SessionJoinerProps {
  playerId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  wsConnection: WebSocket | null;
}

const SessionJoiner: React.FC<SessionJoinerProps> = ({
  playerId,
  playerName,
  setPlayerName,
  wsConnection,
}) => {
  const [joinCode, setJoinCode] = useState("");
  const [localName, setLocalName] = useState(playerName);
  const [publicSessions, setPublicSessions] = useState<PublicSession[]>([]);
  const [activeTab, setActiveTab] = useState("code");
  const { toast } = useToast();

  useEffect(() => {
    const fetchPublicSessions = () => {
      wsConnection?.send(JSON.stringify({
        type: 'getPublicSessions',
        playerId,
      }));
    };

    if (wsConnection && activeTab === "browse") {
      fetchPublicSessions();
      const interval = setInterval(fetchPublicSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [wsConnection, playerId, activeTab]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'publicSessions') {
          setPublicSessions(data.data);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    if (wsConnection) {
      wsConnection.addEventListener('message', handleMessage);
      return () => wsConnection.removeEventListener('message', handleMessage);
    }
  }, [wsConnection]);

  const joinSession = () => {
    if (!joinCode.trim()) {
      toast({
        title: "Join code required",
        description: "Please enter a valid join code.",
        variant: "destructive"
      });
      return;
    }

    if (localName.trim() && localName !== playerName) {
      setPlayerName(localName);
      wsConnection?.send(JSON.stringify({
        type: 'setName',
        playerId,
        name: localName
      }));
    }

    wsConnection?.send(JSON.stringify({
      type: 'joinSession',
      playerId,
      joinCode: joinCode.toUpperCase().trim(),
    }));
  };

  const joinPublicSession = (code: string) => {
    if (localName.trim() && localName !== playerName) {
      setPlayerName(localName);
      wsConnection?.send(JSON.stringify({
        type: 'setName',
        playerId,
        name: localName
      }));
    }

    wsConnection?.send(JSON.stringify({
      type: 'joinSession',
      playerId,
      joinCode: code,
    }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Join Game Session</CardTitle>
        <CardDescription>
          Join an existing game session with your friends.
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
        
        <Tabs defaultValue="code" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code">Join with Code</TabsTrigger>
            <TabsTrigger value="browse">Browse Public Games</TabsTrigger>
          </TabsList>
          
          <TabsContent value="code" className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="join-code">Enter Join Code</Label>
              <Input 
                id="join-code"
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>
            
            <Button onClick={joinSession} className="w-full">
              Join Session
            </Button>
          </TabsContent>
          
          <TabsContent value="browse">
            {publicSessions.length > 0 ? (
              <div className="space-y-2">
                {publicSessions.map((session) => (
                  <div key={session.id} className="border rounded-md p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">Game: {session.joinCode}</div>
                      <div className="text-sm text-gray-500">
                        Players: {session.playersCount} ({session.readyCount} ready)
                      </div>
                    </div>
                    <Button onClick={() => joinPublicSession(session.joinCode)}>
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No public games available.
                <div className="mt-2">
                  <Button variant="outline" onClick={() => setActiveTab("code")}>
                    Join with Code
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SessionJoiner;
