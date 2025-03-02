
import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LobbyProps = {
  playerId: string | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  handleStartGame: () => void;
  joinSession: (sessionId: string) => void;
  createSession: (isPublic: boolean) => void;
  isHost: boolean;
  sessionId: string | null;
  players: any[];
  onReadyStatusChange: (isReady: boolean) => void;
  isLobbyPrivate: boolean;
  toggleLobbyPrivacy: () => void;
  leaveSession: () => void;
  publicSessions: any[];
  joinPublicSession: (sessionId: string) => void;
};

const Lobby: React.FC<LobbyProps> = ({
  playerId,
  playerName,
  setPlayerName,
  handleStartGame,
  joinSession,
  createSession,
  isHost,
  sessionId,
  players,
  onReadyStatusChange,
  isLobbyPrivate,
  toggleLobbyPrivacy,
  leaveSession,
  publicSessions,
  joinPublicSession
}) => {
  const [isReady, setIsReady] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showPublicLobbies, setShowPublicLobbies] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (sessionId) {
      // Reset ready status when joining a new session
      setIsReady(false);
    }
  }, [sessionId]);

  const handleCopySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
        .then(() => toast.success('Session ID copied to clipboard!'))
        .catch(() => toast.error('Failed to copy session ID'));
    }
  };
  
  const handleCopySessionLink = () => {
    if (sessionId) {
      const url = `${window.location.origin}?session=${sessionId}`;
      navigator.clipboard.writeText(url)
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => toast.error('Failed to copy link'));
    }
  };

  const handleReadyToggle = () => {
    const newReadyStatus = !isReady;
    setIsReady(newReadyStatus);
    onReadyStatusChange(newReadyStatus);
  };

  const handleCreateSession = () => {
    createSession(isPublic);
    toast.success('Game session created!');
  };

  const handleJoinSession = () => {
    if (joinCode.trim() === '') {
      toast.error('Please enter a session ID');
      return;
    }
    joinSession(joinCode.trim());
    setJoinCode('');
    setShowJoinForm(false);
  };

  // Check if all players are ready
  const allPlayersReady = players.length > 0 && players.every(player => player.isReady);
  
  // Player count in session
  const playerCount = players.length;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-black/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-xl w-full mx-4">
        {!sessionId ? (
          // CREATE OR JOIN SCREEN
          <>
            <h2 className="text-2xl font-bold text-center text-white mb-6">Snake Game Lobby</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="playerName" className="block text-sm font-medium text-white/80 mb-2">
                  Your Name
                </label>
                <Input
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your name"
                  maxLength={15}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Create New Game</h3>
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80" htmlFor="public-switch">
                      {isPublic ? (
                        <div className="flex items-center gap-1">
                          <Globe className="w-4 h-4" /> Public Lobby
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Lock className="w-4 h-4" /> Private Lobby
                        </div>
                      )}
                    </Label>
                    <Switch
                      id="public-switch"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateSession}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!playerName.trim()}
                  >
                    Create Game
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Join Existing Game</h3>
                  {showJoinForm ? (
                    <div className="space-y-3">
                      <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Enter session ID"
                        className="w-full bg-gray-900/60 border border-white/20 text-white"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleJoinSession}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          disabled={!playerName.trim() || !joinCode.trim()}
                        >
                          Join
                        </Button>
                        <Button
                          onClick={() => setShowJoinForm(false)}
                          variant="outline"
                          className="bg-transparent text-white border-white/20 hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowJoinForm(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={!playerName.trim()}
                    >
                      Join with Code
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => setShowPublicLobbies(!showPublicLobbies)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!playerName.trim()}
                  >
                    {showPublicLobbies ? 'Hide Public Lobbies' : 'Browse Public Lobbies'}
                  </Button>
                </div>
              </div>
              
              {showPublicLobbies && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Public Lobbies</h3>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-white/20">
                    {publicSessions.length > 0 ? (
                      <div className="divide-y divide-white/10">
                        {publicSessions.map((session) => (
                          <div key={session.id} className="p-3 flex justify-between items-center hover:bg-white/5">
                            <div>
                              <p className="text-white font-medium">{session.hostName}'s Game</p>
                              <p className="text-xs text-white/70">{session.players.length} players</p>
                            </div>
                            <Button
                              onClick={() => joinPublicSession(session.id)}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm py-1"
                              disabled={!playerName.trim()}
                            >
                              Join
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-white/60">
                        No public lobbies available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // GAME LOBBY SCREEN
          <>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-white">Game Lobby</h2>
              <button
                onClick={leaveSession}
                className="rounded-full p-1 hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-900/60 rounded-lg p-3 border border-white/20">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-white/80">Session ID</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopySessionId}
                      className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-white/10"
                      title="Copy session ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-white font-mono break-all text-sm">{sessionId}</p>
                
                <div className="mt-3">
                  <button
                    onClick={handleCopySessionLink}
                    className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-white/10 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy invite link
                  </button>
                </div>
              </div>
              
              {isHost && (
                <div className="flex items-center justify-between">
                  <Label className="text-white/80" htmlFor="private-switch">
                    {isLobbyPrivate ? (
                      <div className="flex items-center gap-1">
                        <Lock className="w-4 h-4" /> Private Lobby
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" /> Public Lobby
                      </div>
                    )}
                  </Label>
                  <Switch
                    id="private-switch"
                    checked={isLobbyPrivate}
                    onCheckedChange={toggleLobbyPrivacy}
                  />
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Players ({playerCount})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-gray-900/40 p-2 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-white">{player.name}</span>
                        {player.isHost && <span className="text-xs text-yellow-400 px-1 rounded-sm">(Host)</span>}
                      </div>
                      <div>
                        {player.isReady && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={handleReadyToggle}
                  className={`px-6 py-2 ${isReady ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                >
                  {isReady ? 'Ready' : 'Not Ready'}
                </Button>
                
                {isHost && (
                  <div className="text-sm text-white/70">
                    {allPlayersReady 
                      ? "All players ready! Game will start automatically." 
                      : "Waiting for all players to be ready..."}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Lobby;
