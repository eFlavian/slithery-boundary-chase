
import React, { useState, useEffect, useRef } from 'react';
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

// Keep a global reference to the WebSocket so we can avoid creating multiple connections
let globalWsConnection: WebSocket | null = null;

const SessionManager: React.FC<SessionManagerProps> = ({ onJoinSession }) => {
  const [playerName, setPlayerName] = useState(() => {
    const storedName = localStorage.getItem('playerName');
    return storedName || '';
  });
  const [sessionCode, setSessionCode] = useState('');
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [joinCodeFromUrl, setJoinCodeFromUrl] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const hasTriedJoinRef = useRef<boolean>(false);
  const isComponentMountedRef = useRef<boolean>(true);
  const pingIntervalRef = useRef<number | null>(null);

  // On component mount
  useEffect(() => {
    isComponentMountedRef.current = true;
    
    return () => {
      isComponentMountedRef.current = false;
      
      // Clear any intervals on unmount
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        window.clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, []);

  // Check for join code in URL and parse it
  useEffect(() => {
    const parseUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');
      
      if (joinCode) {
        console.log('Join code found in URL:', joinCode);
        setSessionCode(joinCode);
        setJoinCodeFromUrl(joinCode);
        
        // Clean the URL without refreshing the page
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    };
    
    // Parse URL parameters on mount
    parseUrlParams();
    
    // Also add event listener for popstate (back/forward navigation)
    window.addEventListener('popstate', parseUrlParams);
    
    return () => {
      window.removeEventListener('popstate', parseUrlParams);
    };
  }, []);

  // Store player name in localStorage whenever it changes
  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  useEffect(() => {
    // Connect to WebSocket server, but only if we don't already have a connection
    if (globalWsConnection && globalWsConnection.readyState !== WebSocket.CLOSED) {
      // If we already have a connection that's not closed, use it
      setIsConnected(globalWsConnection.readyState === WebSocket.OPEN);
      return;
    }
    
    // No existing connection or it's closed, create a new one
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const wsUrl = `${protocol}//${wsHost}`;
    
    console.log(`Connecting to WebSocket server at: ${wsUrl}`);
    
    try {
      const ws = new WebSocket(wsUrl);
      globalWsConnection = ws;
      
      ws.onopen = () => {
        if (!isComponentMountedRef.current) return;
        
        console.log('WebSocket connection opened');
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Set up a ping interval to keep the connection alive
        if (pingIntervalRef.current) {
          window.clearInterval(pingIntervalRef.current);
        }
        
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000); // Ping every 20 seconds
      };
      
      ws.onmessage = (event) => {
        if (!isComponentMountedRef.current) return;
        
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'init':
              console.log('Received init with client ID:', message.data.clientId);
              setClientId(message.data.clientId);
              
              // If we have a join code from URL and we're now initialized with an ID, 
              // and we have a player name, try to auto-join
              if (joinCodeFromUrl && playerName.trim() && !hasTriedJoinRef.current && clientId) {
                console.log('Attempting to auto-join with code:', joinCodeFromUrl);
                hasTriedJoinRef.current = true;
                handleJoinSession(joinCodeFromUrl);
              }
              break;
              
            case 'sessionCreated':
            case 'sessionJoined':
              console.log('Session joined/created:', message.data);
              onJoinSession({
                ...message.data,
                playerName,
                clientId: message.data.clientId || clientId,
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
              hasTriedJoinRef.current = false; // Reset so we can try again
              break;
              
            case 'pong':
              // Connection is alive
              break;
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };
      
      ws.onerror = (error) => {
        if (!isComponentMountedRef.current) return;
        
        console.error('WebSocket error:', error);
        toast.error('Failed to connect to game server');
        setIsConnected(false);
        setLoading(false);
        globalWsConnection = null;
      };
      
      ws.onclose = (event) => {
        if (!isComponentMountedRef.current) return;
        
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        globalWsConnection = null;
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          window.clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Only attempt to reconnect if it wasn't a normal closure and component is still mounted
        if (event.code !== 1000 && event.code !== 1001 && isComponentMountedRef.current) {
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < 3) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            console.log(`Attempting to reconnect in ${delay/1000} seconds...`);
            
            if (reconnectTimerRef.current) {
              window.clearTimeout(reconnectTimerRef.current);
            }
            
            reconnectTimerRef.current = window.setTimeout(() => {
              if (isComponentMountedRef.current) {
                setReconnectAttempts(prev => prev + 1);
                globalWsConnection = null; // Clear the connection to allow a new one
              }
            }, delay);
          }
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      toast.error('Failed to connect to game server');
      globalWsConnection = null;
    }
    
    return () => {
      // Do NOT close the websocket on component cleanup - it's global
      // But do clear any intervals
      if (pingIntervalRef.current) {
        window.clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [onJoinSession, reconnectAttempts, joinCodeFromUrl, playerName, clientId]);
  
  // Auto-join attempt when necessary conditions are met
  useEffect(() => {
    // If we have all the necessary pieces and haven't tried joining yet
    if (joinCodeFromUrl && playerName.trim() && clientId && isConnected && !hasTriedJoinRef.current) {
      console.log('Auto-joining session with code:', joinCodeFromUrl);
      hasTriedJoinRef.current = true;
      handleJoinSession(joinCodeFromUrl);
    }
  }, [joinCodeFromUrl, playerName, clientId, isConnected]);
  
  // Refresh the session list periodically
  useEffect(() => {
    if (!globalWsConnection || !isConnected) return;
    
    const fetchSessions = () => {
      if (globalWsConnection && globalWsConnection.readyState === WebSocket.OPEN) {
        globalWsConnection.send(JSON.stringify({
          type: 'listSessions'
        }));
      }
    };
    
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    
    return () => clearInterval(interval);
  }, [isConnected]);
  
  const handleCreateSession = () => {
    if (!validateName()) return;
    
    setLoading(true);
    if (globalWsConnection && globalWsConnection.readyState === WebSocket.OPEN) {
      globalWsConnection.send(JSON.stringify({
        type: 'createSession',
        playerName: playerName.trim()
      }));
    } else {
      setLoading(false);
      toast.error('Not connected to server');
    }
  };
  
  const handleJoinSession = (code?: string) => {
    if (!validateName()) return;
    
    const codeToUse = code || sessionCode.trim();
    if (!codeToUse) {
      toast.error('Please enter a session code');
      return;
    }
    
    setLoading(true);
    console.log('Sending join session request for code:', codeToUse);
    
    if (globalWsConnection && globalWsConnection.readyState === WebSocket.OPEN) {
      globalWsConnection.send(JSON.stringify({
        type: 'joinSession',
        sessionCode: codeToUse,
        playerName: playerName.trim()
      }));
    } else {
      setLoading(false);
      toast.error('Not connected to server');
    }
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
        
        <Tabs defaultValue={joinCodeFromUrl ? "join" : "create"}>
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
                        onClick={() => {
                          if (globalWsConnection && globalWsConnection.readyState === WebSocket.OPEN) {
                            globalWsConnection.send(JSON.stringify({ type: 'listSessions' }));
                          }
                        }}
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
