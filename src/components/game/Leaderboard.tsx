
import React from 'react';
import { Trophy } from 'lucide-react';

type LeaderboardProps = {
  players: any[];
  playerId: string | null;
};

const Leaderboard: React.FC<LeaderboardProps> = ({ players, playerId }) => {
  // Only include players who have started the game
  const activePlayers = players.filter(player => player.isPlaying);
  
  // Only show top 10 active players
  const topPlayers = [...activePlayers]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
    
  return (
    <div className="absolute left-4 top-20 z-[999] max-w-[180px]">
      <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="text-xs uppercase tracking-wider text-white font-semibold">Leaderboard</h3>
        </div>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
          {topPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex justify-between items-center text-xs rounded-lg px-2 py-1 ${
                player.id === playerId 
                  ? 'bg-blue-500/30 text-white font-semibold' 
                  : 'text-white/90'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs opacity-60 w-4">{index + 1}.</span>
                <span className="truncate">{player.name}</span>
              </div>
              <span className="font-semibold">{player.score}</span>
            </div>
          ))}
          {activePlayers.length === 0 && (
            <div className="text-xs text-white/50 italic text-center py-2">
              No players online
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
