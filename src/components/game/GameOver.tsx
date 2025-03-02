
import React from 'react';

type GameOverProps = {
  score: number;
  onExit?: () => void;
};

const GameOver: React.FC<GameOverProps> = ({ score, onExit }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-sm w-full">
        <h2 className="text-3xl font-bold text-center text-white mb-2">Game Over</h2>
        <p className="text-xl text-center text-white/80 mb-6">Your score: {score}</p>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Play Again
          </button>
          
          {onExit && (
            <button
              onClick={onExit}
              className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Return to Lobby
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameOver;
