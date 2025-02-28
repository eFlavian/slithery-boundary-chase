
import React from "react";
import { Button } from "@/components/ui/button";

interface GameStartingStatusProps {
  countdown: number | null;
  gameStarted: boolean;
  isHost: boolean;
  allPlayersReady: boolean;
  hasMultiplePlayers: boolean;
  gameStarting: boolean;
  emergencyStartGame: () => void;
}

const GameStartingStatus: React.FC<GameStartingStatusProps> = ({
  countdown,
  gameStarted,
  isHost,
  allPlayersReady,
  hasMultiplePlayers,
  gameStarting,
  emergencyStartGame
}) => {
  return (
    <>
      {countdown !== null && (
        <div className="bg-blue-100 p-3 rounded-md text-center">
          <p>Game starting in: <span className="font-bold text-xl">{countdown}</span> seconds</p>
        </div>
      )}

      {gameStarted && (
        <div className="bg-green-100 p-3 rounded-md text-center">
          <p>Game started! Launching game...</p>
          <Button 
            className="mt-2" 
            variant="destructive"
            onClick={emergencyStartGame}
          >
            Force Start Now
          </Button>
        </div>
      )}

      {isHost && allPlayersReady && hasMultiplePlayers && !gameStarting && !gameStarted && (
        <div className="bg-yellow-100 p-3 rounded-md text-center">
          <p>All players ready! Waiting for game to start...</p>
          <Button 
            className="mt-2" 
            variant="outline"
            onClick={emergencyStartGame}
          >
            Force Start Game
          </Button>
        </div>
      )}
    </>
  );
};

export default GameStartingStatus;
