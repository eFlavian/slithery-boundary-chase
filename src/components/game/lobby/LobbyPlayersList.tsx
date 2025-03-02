
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Player } from '@/lib/gameTypes';

type LobbyPlayersListProps = {
  players: Player[];
};

const LobbyPlayersList: React.FC<LobbyPlayersListProps> = ({ players }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">Players ({players.length})</h3>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between bg-gray-900/40 p-2 rounded-lg border border-white/10"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-white">{player.name}</span>
              {player.isHost && <span className="text-xs text-yellow-400 px-1 rounded-sm">(Host)</span>}
            </div>
            <div>
              {player.isReady && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LobbyPlayersList;
