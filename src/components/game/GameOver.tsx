
import React from 'react';
import { Trophy, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GameOverProps = {
  score: number;
};

const GameOver: React.FC<GameOverProps> = ({ score }) => {
  const handlePlayAgain = () => {
    window.location.reload();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[1000]">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-sm w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">Game Over</h2>
        <div className="flex justify-center items-center space-x-2 mb-6">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <p className="text-white text-xl font-semibold">Score: {score}</p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button
            onClick={handlePlayAgain}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <div className="flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Play Again
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
