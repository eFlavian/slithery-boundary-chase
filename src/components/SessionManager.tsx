
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Users, Trophy, Gamepad2, Wifi, BarChart, CircleUser } from "lucide-react";

interface Session {
  code: string;
  hostName: string;
  playerCount: number;
}

interface SessionManagerProps {
  onJoinSession: (sessionData: any) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ onJoinSession }) => {
  const [playerName, setPlayerName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const wsUrl = `${protocol}//${wsHost}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setIsConnected(true);
      setWsConnection(ws);
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'init':
          setClientId(message.data.clientId);
          break;
          
        case 'sessionCreated':
        case 'sessionJoined':
          onJoinSession({
            ...message.data,
            playerName,
            clientId: clientId,
            ws: ws
          });
          setLoading(false);
          break;
          
        case 'sessionList':
          setAvailableSessions(message.data.sessions);
          setLoading(false);
          break;
          
        case 'error':
          toast.error(message.data.message);
          setLoading(false);
          break;
      }
    };
    
    ws.onerror = () => {
      toast.error('Failed to connect to game server');
      setIsConnected(false);
      setLoading(false);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setWsConnection(null);
    };
    
    return () => {
      ws.close();
    };
  }, [onJoinSession, playerName]);
  
  // Refresh the session list periodically
  useEffect(() => {
    const fetchSessions = () => {
      if (wsConnection && isConnected) {
        wsConnection.send(JSON.stringify({
          type: 'listSessions'
        }));
      }
    };
    
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    
    return () => clearInterval(interval);
  }, [wsConnection, isConnected]);
  
  const handleCreateSession = () => {
    if (!validateName()) return;
    
    setLoading(true);
    wsConnection?.send(JSON.stringify({
      type: 'createSession',
      playerName: playerName.trim()
    }));
  };
  
  const handleJoinSession = (code?: string) => {
    if (!validateName()) return;
    
    const codeToUse = code || sessionCode.trim();
    if (!codeToUse) {
      toast.error('Please enter a session code');
      return;
    }
    
    setLoading(true);
    wsConnection?.send(JSON.stringify({
      type: 'joinSession',
      sessionCode: codeToUse,
      playerName: playerName.trim()
    }));
  };
  
  const validateName = () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    
    if (playerName.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return false;
    }
    
    if (playerName.trim().length > 15) {
      toast.error('Name must be 15 characters or less');
      return false;
    }
    
    return true;
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Session code copied to clipboard');
  };
  
  const copyLinkToClipboard = (code: string) => {
    const url = `${window.location.origin}?join=${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard');
  };
  
  // Check if there's a join code in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    
    if (joinCode) {
      setSessionCode(joinCode);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Game Logo/Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Snake Multiplayer</h1>
          <p className="text-muted-foreground">Create a game room or join an existing one</p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
          <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
          {isConnected ? 'Connected to server' : 'Connecting to server...'}
        </div>
        
        {/* Player Name Input */}
        <div className="space-y-2">
          <label htmlFor="playerName" className="text-sm font-medium">
            Your Name
          </label>
          <div className="relative">
            <CircleUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              id="playerName"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>
        
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Game</TabsTrigger>
            <TabsTrigger value="join">Join Game</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Game Room</CardTitle>
                <CardDescription>
                  Start a new game session and invite friends to join you
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button 
                  onClick={handleCreateSession} 
                  className="w-full" 
                  disabled={!isConnected || loading}
                >
                  {loading ? 'Creating...' : 'Create Game Room'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="join" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Join Existing Game</CardTitle>
                <CardDescription>
                  Enter a room code or select from available sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="sessionCode" className="text-sm font-medium">
                    Room Code
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="sessionCode"
                      placeholder="Enter room code"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      className="uppercase"
                      disabled={loading}
                    />
                    <Button 
                      onClick={() => handleJoinSession()} 
                      disabled={!isConnected || loading || !sessionCode}
                    >
                      Join
                    </Button>
                  </div>
                </div>
                
                {availableSessions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Available Rooms</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2" 
                        onClick={() => wsConnection?.send(JSON.stringify({ type: 'listSessions' }))}
                        disabled={loading}
                      >
                        <RefreshIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {availableSessions.map((session) => (
                        <div 
                          key={session.code} 
                          className="flex items-center justify-between p-2 bg-background rounded-md border"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{session.hostName}'s Room</span>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <span className="font-mono uppercase">{session.code}</span>
                              <span className="mx-1.5">•</span>
                              <Users className="h-3 w-3 mr-1" />
                              <span>{session.playerCount}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(session.code)}
                              title="Copy code"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleJoinSession(session.code)}
                              disabled={loading}
                            >
                              Join
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-center pt-4">
          <div className="flex text-sm text-muted-foreground space-x-4">
            <div className="flex items-center">
              <Trophy className="h-4 w-4 mr-1.5" />
              <span>Compete</span>
            </div>
            <div className="flex items-center">
              <Gamepad2 className="h-4 w-4 mr-1.5" />
              <span>Play Together</span>
            </div>
            <div className="flex items-center">
              <BarChart className="h-4 w-4 mr-1.5" />
              <span>Rank Up</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export default SessionManager;
