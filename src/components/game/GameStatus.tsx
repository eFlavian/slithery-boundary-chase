
import React from 'react';
import { Clock, Users, AlertCircle } from 'lucide-react';

type GameStatusProps = {
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  countdownValue: number;
  gameTimeLeft: number;
  players: any[];
};

const GameStatus: React.FC<GameStatusProps> = ({ 
  status, 
  countdownValue, 
  gameTimeLeft,
  players 
}) => {
  if (status === 'waiting') {
    return (
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-lg z-50 backdrop-blur-sm flex items-center gap-2">
        <Users className="w-5 h-5 text-yellow-400 animate-pulse" />
        <span className="text-white font-medium">
          Waiting for players ({players.length}/2 minimum)...
        </span>
      </div>
    );
  }

  if (status === 'countdown') {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="text-8xl font-bold text-white drop-shadow-lg animate-pulse">
          {countdownValue}
        </div>
      </div>
    );
  }

  if (status === 'playing') {
    // Format time as MM:SS
    const minutes = Math.floor(gameTimeLeft / 60);
    const seconds = gameTimeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-lg z-50 backdrop-blur-sm flex items-center gap-2">
        <Clock className={`w-5 h-5 ${gameTimeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`} />
        <span className={`font-medium ${gameTimeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
          {formattedTime}
        </span>
      </div>
    );
  }

  return null;
};

export default GameStatus;
