
import React from 'react';
import { Play } from 'lucide-react';

type StartScreenProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  handleStartGame: () => void;
};

const StartScreen: React.FC<StartScreenProps> = ({ 
  playerName, 
  setPlayerName, 
  handleStartGame 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-sm w-full">
        <h2 className="text-2xl font-bold text-center text-white mb-6">Welcome to Snake Game</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-white/80 mb-2">
              Enter your name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your name"
              maxLength={15}
            />
          </div>
          <button
            onClick={handleStartGame}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
          >
            <Play className="w-5 h-5" />
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
