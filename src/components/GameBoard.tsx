
import React, { useState } from 'react';
import { toast } from 'sonner';
import ThemeToggle from './game/ThemeToggle';
import GameControls from './game/GameControls';
import GameOver from './game/GameOver';
import Minimap from './game/Minimap';
import PlayerScore from './game/PlayerScore';
import Leaderboard from './game/Leaderboard';
import SpeedBoost from './game/SpeedBoost';
import StartScreen from './game/StartScreen';
import GameCanvas from './game/GameCanvas';
import GameStatus from './game/GameStatus';
import BattleRoyaleZone from './game/BattleRoyaleZone';
import useGameWebSocket from './game/useGameWebSocket';
import useGameCamera from '@/hooks/useGameCamera';
import useGameControls from '@/hooks/useGameControls';
import { CELL_SIZE, GRID_SIZE, MIN_SNAKE_OPACITY, MINIMAP_SIZE, INACTIVE_PLAYER_OPACITY } from '@/utils/gameUtils';

const GameBoard: React.FC = () => {
  const {
    playerId,
    players,
    foods,
    yellowDots,
    portals,
    gameOver,
    isPlaying,
    isMinimapVisible,
    minimapTimeLeft,
    gameStatus,
    countdownValue,
    gameTimeLeft,
    battleRoyaleRadius,
    battleRoyaleCenter,
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startGame,
    setGameOver,
    setIsPlaying
  } = useGameWebSocket();

  const [playerName, setPlayerName] = useState('');
  
  const currentPlayer = players.find(p => p.id === playerId);
  const score = currentPlayer?.score || 0;
  const speedBoostPercentage = currentPlayer?.speedBoostPercentage || 0;
  const winner = players.length === 1 && gameOver ? players[0]?.name : undefined;

  const { getTransform } = useGameCamera(currentPlayer, CELL_SIZE);
  
  const { 
    isSpeedBoostActive, 
    setIsSpeedBoostActive, 
    handleDirection 
  } = useGameControls({
    sendDirection,
    sendUpdate,
    currentPlayer,
    isPlaying,
    gameOver,
    gameStatus // Pass gameStatus to useGameControls
  });

  const handleStartGame = () => {
    if (!playerName.trim()) {
      toast.error("Please enter a name first!");
      return;
    }

    startGame(playerName.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/50 dark:from-gray-900 dark:to-gray-800">
      <ThemeToggle />

      {!isPlaying && !gameOver && (
        <StartScreen 
          playerName={playerName}
          setPlayerName={setPlayerName}
          handleStartGame={handleStartGame}
        />
      )}

      {/* Game status display (waiting, countdown, timer) */}
      {isPlaying && (
        <GameStatus 
          status={gameStatus} 
          countdownValue={countdownValue}
          gameTimeLeft={gameTimeLeft}
          players={players}
        />
      )}

      <Minimap 
        isMinimapVisible={isMinimapVisible}
        minimapTimeLeft={minimapTimeLeft}
        players={players}
        foods={foods}
        yellowDots={yellowDots}
        playerId={playerId}
        CELL_SIZE={CELL_SIZE}
        MINIMAP_SIZE={MINIMAP_SIZE}
        GRID_SIZE={GRID_SIZE}
      />
      
      <PlayerScore score={score} />
      <Leaderboard players={players} playerId={playerId} />
      <SpeedBoost isSpeedBoostActive={isSpeedBoostActive} speedBoostPercentage={speedBoostPercentage} />

      <GameCanvas 
        players={players}
        foods={foods}
        yellowDots={yellowDots}
        portals={portals}
        playerId={playerId}
        CELL_SIZE={CELL_SIZE}
        GRID_SIZE={GRID_SIZE}
        MIN_SNAKE_OPACITY={MIN_SNAKE_OPACITY}
        INACTIVE_PLAYER_OPACITY={INACTIVE_PLAYER_OPACITY}
        getViewportTransform={getTransform}
        currentPlayer={currentPlayer}
        gameStatus={gameStatus}
      >
        {/* Battle Royale Zone */}
        {battleRoyaleRadius > 0 && battleRoyaleCenter && (
          <BattleRoyaleZone
            radius={battleRoyaleRadius}
            center={battleRoyaleCenter}
            CELL_SIZE={CELL_SIZE}
            getViewportTransform={getTransform}
          />
        )}
      </GameCanvas>

      <GameControls 
        handleDirection={handleDirection}
        speedBoostPercentage={speedBoostPercentage}
        setIsSpeedBoostActive={setIsSpeedBoostActive}
      />

      {gameOver && <GameOver score={score} winner={winner} />}
    </div>
  );
};

export default GameBoard;
