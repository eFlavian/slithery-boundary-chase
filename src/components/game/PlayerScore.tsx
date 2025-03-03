
import React from 'react';

type PlayerScoreProps = {
  score: number;
};

const PlayerScore: React.FC<PlayerScoreProps> = ({ score }) => {
  return (
    <div className="absolute top-16 right-4 z-[999] text-center">
      <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 text-white">
        <div className="text-3xl font-bold mb-1">{score}</div>
        <div className="text-xs uppercase tracking-widest opacity-70">SCORE</div>
      </div>
    </div>
  );
};

export default PlayerScore;
