
import React from "react";

interface Player {
  id: string;
  name: string;
  isReady: boolean;
}

interface PlayersListProps {
  players: Player[];
  currentPlayerId: string;
  hostId: string;
}

const PlayersList: React.FC<PlayersListProps> = ({
  players,
  currentPlayerId,
  hostId
}) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Players ({players.length})</h3>
      <div className="border rounded-md divide-y">
        {players.map((player) => (
          <div key={player.id} className="flex items-center justify-between p-2">
            <div className="flex items-center">
              <span className="font-medium">
                {player.name} 
                {player.id === currentPlayerId && " (You)"}
                {player.id === hostId && " (Host)"}
              </span>
            </div>
            <div className={`text-sm ${player.isReady ? "text-green-500" : "text-gray-400"}`}>
              {player.isReady ? "Ready" : "Not Ready"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayersList;
