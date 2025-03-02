
import React, { useState } from 'react';
import { Play, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MainMenuProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  onStartFreeRide: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
};

const MainMenu: React.FC<MainMenuProps> = ({
  playerName,
  setPlayerName,
  onStartFreeRide,
  onCreateRoom,
  onJoinRoom
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Snake Game</h2>
        
        <div className="space-y-4 mb-6">
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
        
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white/80 mb-2">Game Modes</h3>
          
          <Button 
            onClick={onStartFreeRide}
            className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-colors"
            disabled={!playerName.trim()}
          >
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5" />
              <span className="text-lg">Free Ride</span>
            </div>
            <span className="text-sm opacity-70">Open world mode</span>
          </Button>
          
          <Button 
            onClick={onCreateRoom}
            className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-colors"
            disabled={!playerName.trim()}
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5" />
              <span className="text-lg">Create Room</span>
            </div>
            <span className="text-sm opacity-70">Host your own game</span>
          </Button>
          
          <Button 
            onClick={onJoinRoom}
            className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-colors"
            disabled={!playerName.trim()}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span className="text-lg">Join Room</span>
            </div>
            <span className="text-sm opacity-70">Play with friends</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
