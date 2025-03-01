
import React from 'react';
import { Copy, Users, Lock, Unlock, Play } from 'lucide-react';
import { SessionData } from './useSessionWebSocket';

interface SessionLobbyProps {
  sessionData: SessionData;
  playerName: string;
  onLeave: () => void;
  onCopyLink: () => void;
  onSetReady: () => void;
  onTogglePrivacy: () => void;
  onStartGame: () => void;
  isHost: boolean;
}

const SessionLobby: React.FC<SessionLobbyProps> = ({
  sessionData,
  playerName,
  onLeave,
  onCopyLink,
  onSetReady,
  onTogglePrivacy,
  onStartGame,
  isHost,
}) => {
  const currentPlayer = sessionData.players.find(p => p.id === sessionData.playerId);
  const allReady = sessionData.players.length > 0 && sessionData.players.every(player => player.ready);
  const countdown = sessionData.countdown || 0;
  const isCountingDown = countdown > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Game Lobby</h2>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-gray-800 rounded-lg text-white text-sm flex items-center gap-1">
              <span>Code: {sessionData.sessionId}</span>
              <button onClick={onCopyLink} className="p-1 hover:text-blue-400 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              <span>Players ({sessionData.players.length})</span>
            </div>
            {isHost && (
              <button 
                onClick={onTogglePrivacy}
                className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                {sessionData.isPrivate ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Public</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {sessionData.players.map(player => (
              <div 
                key={player.id} 
                className={`flex justify-between items-center p-3 rounded-lg ${
                  player.id === sessionData.playerId 
                    ? "bg-blue-900/40 border border-blue-500/30" 
                    : "bg-gray-800/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-white">{player.name}</span>
                  {player.isHost && <span className="text-xs text-gray-400">(Host)</span>}
                </div>
                <div className="text-sm px-2 py-1 rounded-md bg-gray-700 text-white">
                  {player.ready ? "Ready" : "Not Ready"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isCountingDown && (
          <div className="mb-4 text-center">
            <div className="text-2xl font-bold text-white">Game starting in {countdown}...</div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Leave
          </button>
          
          <button
            onClick={onSetReady}
            disabled={isCountingDown}
            className={`flex-1 px-4 py-2 ${
              currentPlayer?.ready 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-blue-600 hover:bg-blue-700"
            } text-white rounded-lg transition-colors ${
              isCountingDown ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {currentPlayer?.ready ? "Ready ✓" : "Ready Up"}
          </button>
          
          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!allReady || isCountingDown}
              className={`px-4 py-2 flex items-center gap-1 bg-green-600 text-white rounded-lg ${
                !allReady || isCountingDown 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:bg-green-700"
              } transition-colors`}
            >
              <Play className="w-5 h-5" />
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionLobby;
