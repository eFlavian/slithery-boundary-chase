
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import useGameWebSocket from './game/useGameWebSocket';

type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Constants
const GRID_SIZE = 256;
const CELL_SIZE = 15;
const INITIAL_SPEED = 140;
const CAMERA_SMOOTHING = 0.55;
const MIN_SNAKE_OPACITY = 0.3;
const MINIMAP_SIZE = 150;
const INACTIVE_PLAYER_OPACITY = 0.2;
const KEY_DEBOUNCE = 50;

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
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startGame,
    setGameOver,
    setIsPlaying
  } = useGameWebSocket();

  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  const [playerName, setPlayerName] = useState('');
  
  const gameLoop = useRef<number>();
  const lastKeyPress = useRef(0);
  const cameraPositionRef = useRef({ x: 0, y: 0 });
  const lastUpdateTime = useRef(0);
  const animationFrameRef = useRef<number>();
  const directionRef = useRef<Direction>('RIGHT');

  // Update the ref whenever the state changes
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const handleStartGame = useCallback(() => {
    if (!playerName.trim()) {
      toast.error("Please enter a name first!");
      return;
    }

    startGame(playerName.trim());
  }, [playerName, startGame]);

  const handleDirection = useCallback((newDirection: Direction) => {
    const oppositeDirections: Record<Direction, Direction> = {
      'UP': 'DOWN',
      'DOWN': 'UP',
      'LEFT': 'RIGHT',
      'RIGHT': 'LEFT'
    };
    
    if (oppositeDirections[directionRef.current] === newDirection) {
      return;
    }

    if (directionRef.current !== newDirection) {
      setDirection(newDirection);
      sendDirection(newDirection);
      updateGame();
    }
  }, [sendDirection]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
    }

    const now = Date.now();
    if (now - lastKeyPress.current < KEY_DEBOUNCE) return;
    lastKeyPress.current = now;

    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        event.preventDefault();
        if (directionRef.current !== 'DOWN') {
          handleDirection('UP');
        }
        break;
      case 'arrowdown':
      case 's':
        event.preventDefault();
        if (directionRef.current !== 'UP') {
          handleDirection('DOWN');
        }
        break;
      case 'arrowleft':
      case 'a':
        event.preventDefault();
        if (directionRef.current !== 'RIGHT') {
          handleDirection('LEFT');
        }
        break;
      case 'arrowright':
      case 'd':
        event.preventDefault();
        if (directionRef.current !== 'LEFT') {
          handleDirection('RIGHT');
        }
        break;
      case ' ':
        event.preventDefault();
        if (currentPlayer?.speedBoostPercentage > 0) {
          setIsSpeedBoostActive(true);
        }
        break;
    }
  }, [handleDirection]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === ' ') {
      setIsSpeedBoostActive(false);
    }
  }, []);

  const updateGame = useCallback(() => {
    sendUpdate();

    if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage > 0) {
      sendSpeedBoost();
    } else if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage <= 0) {
      setIsSpeedBoostActive(false);
    }
  }, [isSpeedBoostActive, currentPlayer, sendUpdate, sendSpeedBoost]);

  // Memoize game loop setup/teardown
  useEffect(() => {
    if (!gameOver && playerId && isPlaying) {
      const speed = isSpeedBoostActive ? INITIAL_SPEED / 2 : INITIAL_SPEED;
      
      if (gameLoop.current) {
        clearInterval(gameLoop.current);
      }
      
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => {
        if (gameLoop.current) {
          clearInterval(gameLoop.current);
        }
      };
    }
  }, [gameOver, isSpeedBoostActive, playerId, isPlaying, updateGame]);

  const currentPlayer = players.find(p => p.id === playerId);
  const score = currentPlayer?.score || 0;
  const speedBoostPercentage = currentPlayer?.speedBoostPercentage || 0;

  // Memoized lerp function for smoother camera transitions
  const lerp = useCallback((start: number, end: number, t: number) => 
    start + (end - start) * t, []);

  // Optimized viewport transform calculation
  const getViewportTransform = useCallback((snakeHead: Position) => {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    const viewportCenterX = containerWidth / 2;
    const viewportCenterY = containerHeight / 2;

    const targetX = viewportCenterX - (snakeHead.x * CELL_SIZE);
    const targetY = viewportCenterY - (snakeHead.y * CELL_SIZE);

    const now = performance.now();
    const deltaTime = now - lastUpdateTime.current;
    lastUpdateTime.current = now;

    const smoothing = 1 - Math.exp(-CAMERA_SMOOTHING * (deltaTime / 1000)); // Exponential smoothing

    cameraPositionRef.current.x = lerp(cameraPositionRef.current.x, targetX, smoothing);
    cameraPositionRef.current.y = lerp(cameraPositionRef.current.y, targetY, smoothing);

    return `translate3d(${Math.round(cameraPositionRef.current.x)}px, ${Math.round(cameraPositionRef.current.y)}px, 0)`;
  }, [lerp]);

  // Optimized camera update with requestAnimationFrame
  const updateCamera = useCallback(() => {
    if (currentPlayer?.snake?.[0]) {
      const container = document.querySelector('.game-container') as HTMLDivElement;
      if (container) {
        container.style.transform = getViewportTransform(currentPlayer.snake[0]);
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateCamera);
  }, [currentPlayer, getViewportTransform]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateCamera);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateCamera]);

  useEffect(() => {
    if (currentPlayer?.snake?.[0]) {
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      cameraPositionRef.current = {
        x: containerWidth / 2 - (currentPlayer.snake[0].x * CELL_SIZE),
        y: containerHeight / 2 - (currentPlayer.snake[0].y * CELL_SIZE)
      };
    }
  }, [playerId, currentPlayer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

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
        getViewportTransform={getViewportTransform}
        currentPlayer={currentPlayer}
      />

      <GameControls 
        handleDirection={handleDirection}
        speedBoostPercentage={speedBoostPercentage}
        setIsSpeedBoostActive={setIsSpeedBoostActive}
      />

      {gameOver && <GameOver score={score} />}
    </div>
  );
};

export default GameBoard;
