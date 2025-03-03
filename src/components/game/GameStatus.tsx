
import React, { useEffect } from 'react';
import { Clock, Users } from 'lucide-react';

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
  // Only count active players (those who have spawned/started the game)
  const activePlayers = players.filter(player => player.isPlaying);
  
  // Determine if minimum players requirement is met (need at least 2 players)
  const hasMinimumPlayers = activePlayers.length >= 2;
  
  useEffect(() => {
    console.log("GameStatus component - current status:", status);
    console.log("GameStatus component - countdown value:", countdownValue);
    console.log("GameStatus component - game time left:", gameTimeLeft);
  }, [status, countdownValue, gameTimeLeft]);
  
  if (status === 'waiting') {
    // If we have minimum players, show countdown instead of waiting message
    if (hasMinimumPlayers) {
      return (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-lg z-50 backdrop-blur-sm">
          <div className="flex items-center justify-center">
            <span className="text-white font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
              Game starts in: <span className="text-yellow-400 font-bold">{countdownValue}</span>s
            </span>
          </div>
        </div>
      );
    }
    
    // If not enough players, show waiting for players message
    return (
      <div className="fixed top-28 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-lg z-50 backdrop-blur-sm flex items-center gap-2">
        <Users className="w-5 h-5 text-yellow-400 animate-pulse" />
        <span className="text-white font-medium">
          Waiting for players...
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
    
    // Add pulsing effect for last 30 seconds
    const isEndingSoon = gameTimeLeft <= 30;

    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-lg z-50 backdrop-blur-sm flex items-center gap-2">
        <Clock className={`w-5 h-5 ${isEndingSoon ? 'text-red-500 animate-pulse' : 'text-white'}`} />
        <span className={`font-medium ${isEndingSoon ? 'text-red-500' : 'text-white'}`}>
          {formattedTime}
        </span>
      </div>
    );
  }

  return null;
};

export default GameStatus;
