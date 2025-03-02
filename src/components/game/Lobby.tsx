
import React, { useState, useEffect } from 'react';
import { Session } from './useGameWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, X, CheckSquare, RefreshCw, Globe, Lock, Share2 } from 'lucide-react';
import { toast } from 'sonner';

type LobbyProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  playerId: string | null;
  sessions: Session[];
  currentSession: Session | null;
  isHost: boolean;
  isReady: boolean;
  joinCode: string;
  createSession: (sessionName: string, visibility: 'public' | 'private') => void;
  joinSession: (code: string) => void;
  leaveSession: () => void;
  toggleReady: () => void;
  toggleSessionVisibility: () => void;
  fetchSessions: () => void;
  handleStartGame: () => void;
};

const Lobby: React.FC<LobbyProps> = ({
  playerName,
  setPlayerName,
  playerId,
  sessions,
  currentSession,
  isHost,
  isReady,
  joinCode,
  createSession,
  joinSession,
  leaveSession,
  toggleReady,
  toggleSessionVisibility,
  fetchSessions,
  handleStartGame
}) => {
  const [newSessionName, setNewSessionName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');

  // Refresh sessions list periodically
  useEffect(() => {
    if (showSessions && !currentSession) {
      fetchSessions();
      const interval = setInterval(fetchSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [showSessions, currentSession]);

  const handleCreateSession = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name first!");
      return;
    }
    
    if (!newSessionName.trim()) {
      toast.error("Please enter a session name!");
      return;
    }
    
    createSession(newSessionName, visibility);
    setNewSessionName('');
  };

  const handleJoinSession = (code: string = joinCodeInput) => {
    if (!playerName.trim()) {
      toast.error("Please enter your name first!");
      return;
    }
    
    if (!code.trim()) {
      toast.error("Please enter a join code!");
      return;
    }
    
    joinSession(code);
    setJoinCodeInput('');
  };

  const copyJoinLink = () => {
    const joinLink = `${window.location.origin}?code=${joinCode}`;
    navigator.clipboard.writeText(joinLink);
    toast.success("Join link copied to clipboard!");
  };

  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    toast.success("Join code copied to clipboard!");
  };

  // Check URL for join code on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    
    if (codeFromUrl && !currentSession) {
      setJoinCodeInput(codeFromUrl);
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Only auto-join if the player has set their name
      if (playerName.trim()) {
        handleJoinSession(codeFromUrl);
      }
    }
  }, [playerName]);

  if (currentSession) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            {currentSession.name}
            <span className="ml-2 text-sm">
              {currentSession.visibility === 'public' ? 
                <Globe className="inline-block h-4 w-4 text-green-400" /> : 
                <Lock className="inline-block h-4 w-4 text-yellow-400" />}
            </span>
          </h2>
          <Button variant="ghost" size="icon" onClick={leaveSession} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="bg-black/20 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-white/70 mr-2">Join Code:</span>
            <span className="font-mono text-lg text-white">{joinCode}</span>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={copyJoinCode} className="h-8 w-8 text-blue-400 hover:text-blue-300">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={copyJoinLink} className="h-8 w-8 text-blue-400 hover:text-blue-300">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Players</h3>
          <div className="bg-black/20 rounded-lg divide-y divide-white/10">
            {currentSession.players.map(player => (
              <div key={player.id} className="py-2 px-3 flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`${player.id === playerId ? 'text-blue-400' : 'text-white'} ${player.id === currentSession.hostId ? 'font-semibold' : ''}`}>
                    {player.name} {player.id === currentSession.hostId && '(Host)'}
                  </span>
                </div>
                {player.isReady ? (
                  <span className="text-green-400 text-sm flex items-center">
                    Ready <CheckSquare className="ml-1 h-4 w-4" />
                  </span>
                ) : (
                  <span className="text-yellow-400 text-sm">Not Ready</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          {isHost && (
            <Button 
              onClick={toggleSessionVisibility} 
              variant="outline"
              className="bg-transparent border-white/30 text-white hover:bg-white/10"
            >
              {currentSession.visibility === 'public' ? (
                <>Make Private <Lock className="ml-2 h-4 w-4" /></>
              ) : (
                <>Make Public <Globe className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          )}
          
          <Button 
            onClick={toggleReady} 
            variant={isReady ? "default" : "secondary"}
            className={isReady ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isReady ? "I'm Ready!" : "Mark as Ready"}
            {isReady && <CheckSquare className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-center text-white mb-6">Welcome to Snake Game</h2>
      
      <div className="space-y-6">
        <div>
          <Label htmlFor="playerName" className="text-white/80">Your Name</Label>
          <Input
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="bg-black/30 border-white/20 text-white"
            placeholder="Enter your name"
            maxLength={15}
          />
        </div>
        
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-lg font-semibold text-white mb-3">Create a Game</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="sessionName" className="text-white/80">Session Name</Label>
              <Input
                id="sessionName"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="bg-black/30 border-white/20 text-white"
                placeholder="My Game Session"
                maxLength={20}
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant={visibility === 'private' ? "default" : "outline"}
                onClick={() => setVisibility('private')}
                className={visibility === 'private' ? "bg-blue-600 hover:bg-blue-700" : "bg-transparent border-white/30 text-white hover:bg-white/10"}
                size="sm"
              >
                <Lock className="mr-1 h-4 w-4" /> Private
              </Button>
              <Button
                variant={visibility === 'public' ? "default" : "outline"}
                onClick={() => setVisibility('public')}
                className={visibility === 'public' ? "bg-green-600 hover:bg-green-700" : "bg-transparent border-white/30 text-white hover:bg-white/10"}
                size="sm"
              >
                <Globe className="mr-1 h-4 w-4" /> Public
              </Button>
            </div>
            
            <Button 
              onClick={handleCreateSession}
              className="w-full" 
            >
              Create Game Session
            </Button>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-lg font-semibold text-white mb-3">Join a Game</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="joinCode" className="text-white/80">Join Code</Label>
              <Input
                id="joinCode"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                className="bg-black/30 border-white/20 text-white"
                placeholder="Enter join code"
              />
            </div>
            
            <Button 
              onClick={() => handleJoinSession()}
              className="w-full"
              variant="secondary"
            >
              Join with Code
            </Button>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-4">
          <div className="flex justify-between items-center mb-2">
            <Button 
              onClick={() => setShowSessions(!showSessions)}
              variant="ghost"
              className="text-white/80 hover:text-white p-0 h-auto"
            >
              {showSessions ? "Hide Public Games" : "Browse Public Games"}
            </Button>
            {showSessions && (
              <Button
                onClick={fetchSessions}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {showSessions && (
            <div className="max-h-60 overflow-y-auto bg-black/20 rounded-lg divide-y divide-white/10">
              {sessions.filter(s => s.visibility === 'public').length === 0 ? (
                <div className="p-3 text-white/60 text-center">
                  No public games available
                </div>
              ) : (
                sessions
                  .filter(s => s.visibility === 'public')
                  .map(session => (
                    <div key={session.id} className="py-2 px-3 flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{session.name}</div>
                        <div className="text-xs text-white/60">
                          {session.players.length} player{session.players.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleJoinSession(session.code)}
                        size="sm"
                        variant="secondary"
                        className="h-8"
                      >
                        Join
                      </Button>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
