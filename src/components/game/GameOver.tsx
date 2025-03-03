
import React from 'react';
import { Trophy, Play, Crown } from 'lucide-react';

type GameOverProps = {
  score: number;
  winner?: string;
};

const GameOver: React.FC<GameOverProps> = ({ score, winner }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[1000]">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-sm w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">Game Over</h2>
        
        {winner && (
          <div className="flex flex-col items-center mb-6">
            <Crown className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-yellow-300 text-xl font-bold">{winner} is the King!</p>
          </div>
        )}
        
        <div className="flex justify-center items-center space-x-2 mb-6">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <p className="text-white text-xl font-semibold">Your Score: {score}</p>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <div className="flex items-center justify-center gap-2">
            <Play className="w-4 h-4" />
            Play Again
          </div>
        </button>
      </div>
    </div>
  );
};

export default GameOver;
