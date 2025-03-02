
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Users } from 'lucide-react';

type StartScreenProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  handleStartGame: () => void;
  onRoomsClick: () => void;
};

const StartScreen: React.FC<StartScreenProps> = ({ 
  playerName, 
  setPlayerName, 
  handleStartGame,
  onRoomsClick
}) => {
  return (
    <div className="bg-black/40 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm">
      <h1 className="text-2xl font-bold mb-6 text-center text-white">Snake Game</h1>
      
      <div className="mb-6">
        <label htmlFor="playerName" className="block text-sm font-medium mb-2 text-white/90">
          Your Name
        </label>
        <input
          id="playerName"
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full px-3 py-2 bg-black/30 text-white border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Enter your name"
          maxLength={15}
          autoComplete="off"
        />
      </div>
      
      <div className="flex flex-col gap-3">
        <Button
          onClick={handleStartGame}
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={!playerName.trim()}
        >
          <div className="flex items-center justify-center gap-2">
            <Play className="w-4 h-4" />
            Play Solo
          </div>
        </Button>
        
        <Button
          onClick={onRoomsClick}
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={!playerName.trim()}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            Join Multiplayer Room
          </div>
        </Button>
      </div>
      
      <p className="mt-4 text-xs text-center text-white/60">
        Use arrow keys or WASD to move. Space for speed boost.
      </p>
    </div>
  );
};

export default StartScreen;
