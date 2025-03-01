
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
import SessionLobby from './SessionLobby';
import useSessionWebSocket from './useSessionWebSocket';

const SessionManager: React.FC = () => {
  const navigate = useNavigate();
  const [showJoinSession, setShowJoinSession] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  const {
    isConnected,
    connectingAttempts,
    sessionData,
    createSession,
    joinSession,
    leaveSession,
    setReady,
    togglePrivacy,
    startGame,
    reconnect
  } = useSessionWebSocket();

  // Check for session code in URL params on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('session');
    if (code) {
      setJoinCode(code);
      setShowJoinSession(true);
    }
  }, []);

  const handleCreateSession = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name first!");
      return;
    }
    createSession(playerName);
  };

  const handleJoinSession = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name first!");
      return;
    }
    if (!joinCode.trim()) {
      toast.error("Please enter a session code!");
      return;
    }
    joinSession(joinCode, playerName);
  };

  const handleCopyLink = () => {
    if (sessionData?.sessionId) {
      const sessionUrl = `${window.location.origin}?session=${sessionData.sessionId}`;
      navigator.clipboard.writeText(sessionUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const backToMenu = () => {
    if (sessionData?.sessionId) {
      leaveSession();
    }
    setShowJoinSession(false);
    setJoinCode('');
  };

  // If not in a session, show the create/join screen
  if (!sessionData?.sessionId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-sm w-full">
          <h2 className="text-2xl font-bold text-center text-white mb-6">
            Snake Game - Multiplayer
          </h2>
          
          {!isConnected ? (
            <div className="space-y-4 text-center">
              <div className="animate-pulse text-white mb-4">
                Connecting to game server... ({connectingAttempts}/5)
              </div>
              {connectingAttempts >= 5 && (
                <button
                  onClick={reconnect}
                  className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Retry Connection
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label htmlFor="playerName" className="block text-sm font-medium text-white/80 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your name"
                    maxLength={15}
                  />
                </div>
                
                {!showJoinSession ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleCreateSession}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create New Session
                    </button>
                    <button
                      onClick={() => setShowJoinSession(true)}
                      className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Join a Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="sessionCode" className="block text-sm font-medium text-white/80 mb-2">
                        Session Code
                      </label>
                      <input
                        type="text"
                        id="sessionCode"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter session code"
                        maxLength={6}
                      />
                    </div>
                    <button
                      onClick={handleJoinSession}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Join Session
                    </button>
                    <button
                      onClick={() => setShowJoinSession(false)}
                      className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // If already in session, show the session lobby
  return (
    <SessionLobby
      sessionData={sessionData}
      playerName={playerName} 
      onLeave={backToMenu}
      onCopyLink={handleCopyLink}
      onSetReady={setReady}
      onTogglePrivacy={togglePrivacy}
      onStartGame={startGame}
      isHost={sessionData.players.find(p => p.id === sessionData.playerId)?.isHost || false}
    />
  );
};

export default SessionManager;
