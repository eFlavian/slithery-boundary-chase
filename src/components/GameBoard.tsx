
import React, { useRef, useState, useEffect } from 'react';
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
import Lobby from './game/Lobby';
import useGameWebSocket from './game/useGameWebSocket';
import GameKeyboardControls from './game/GameKeyboardControls';
import GameLoop from './game/GameLoop';
import CameraUpdateLoop from './game/CameraUpdateLoop';
import { Direction, Position } from '@/lib/gameTypes';
import { CELL_SIZE, GRID_SIZE } from '@/lib/gameConstants';

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
    sessionId,
    isHost,
    isLobbyPrivate,
    publicSessions,
    inLobby,
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startGame,
    setGameOver,
    setIsPlaying,
    createSession,
    joinSession,
    setReadyStatus,
    toggleLobbyPrivacy,
    leaveSession
  } = useGameWebSocket();

  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  const [playerName, setPlayerName] = useState(() => {
    const savedName = localStorage.getItem('playerName');
    return savedName || '';
  });
  
  const cameraPositionRef = useRef({ x: 0, y: 0 });
  
  // Get current player
  const currentPlayer = players.find(p => p.id === playerId);
  const score = currentPlayer?.score || 0;
  const speedBoostPercentage = currentPlayer?.speedBoostPercentage || 0;

  // Save player name to localStorage when it changes
  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  const handleStartGame = () => {
    if (!playerName.trim()) {
      toast.error("Please enter a name first!");
      return;
    }

    startGame(playerName.trim());
  };

  const updateGame = () => {
    sendUpdate();

    if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage > 0) {
      sendSpeedBoost();
    } else if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage <= 0) {
      setIsSpeedBoostActive(false);
    }
  };

  // Set initial camera position when player joins
  useEffect(() => {
    if (currentPlayer?.snake?.[0]) {
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      cameraPositionRef.current = {
        x: containerWidth / 2 - (currentPlayer.snake[0].x * CELL_SIZE),
        y: containerHeight / 2 - (currentPlayer.snake[0].y * CELL_SIZE)
      };
    }
  }, [playerId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/50 dark:from-gray-900 dark:to-gray-800">
      <ThemeToggle />

      {/* Non-visual components for game mechanics */}
      <GameKeyboardControls 
        direction={direction}
        setDirection={setDirection}
        sendDirection={sendDirection}
        isSpeedBoostActive={isSpeedBoostActive}
        setIsSpeedBoostActive={setIsSpeedBoostActive}
        speedBoostPercentage={speedBoostPercentage}
        updateGame={updateGame}
        isGameActive={isPlaying && !gameOver}
      />
      
      <GameLoop 
        isGameActive={isPlaying && !gameOver && !!playerId}
        isSpeedBoostActive={isSpeedBoostActive}
        updateGame={updateGame}
      />
      
      <CameraUpdateLoop 
        isActive={isPlaying && !gameOver && !!currentPlayer}
        currentPlayerHead={currentPlayer?.snake?.[0]}
        cameraPositionRef={cameraPositionRef}
      />

      {/* Game UI components */}
      {!isPlaying && !gameOver && !inLobby && (
        <StartScreen 
          playerName={playerName}
          setPlayerName={setPlayerName}
          handleStartGame={handleStartGame}
        />
      )}
      
      {!isPlaying && !gameOver && inLobby && (
        <Lobby 
          playerId={playerId}
          playerName={playerName}
          setPlayerName={setPlayerName}
          handleStartGame={handleStartGame}
          joinSession={joinSession}
          createSession={createSession}
          isHost={isHost}
          sessionId={sessionId}
          players={players}
          onReadyStatusChange={setReadyStatus}
          isLobbyPrivate={isLobbyPrivate}
          toggleLobbyPrivacy={toggleLobbyPrivacy}
          leaveSession={leaveSession}
          publicSessions={publicSessions}
          joinPublicSession={joinSession}
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
        currentPlayer={currentPlayer}
      />

      <GameControls 
        handleDirection={(newDirection) => setDirection(newDirection)}
        speedBoostPercentage={speedBoostPercentage}
        setIsSpeedBoostActive={setIsSpeedBoostActive}
      />

      {gameOver && <GameOver score={score} />}
    </div>
  );
};

export default GameBoard;
