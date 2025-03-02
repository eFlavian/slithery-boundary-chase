import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import ThemeToggle from './game/ThemeToggle';
import GameControls from './game/GameControls';
import GameOver from './game/GameOver';
import Minimap from './game/Minimap';
import PlayerScore from './game/PlayerScore';
import Leaderboard from './game/Leaderboard';
import SpeedBoost from './game/SpeedBoost';
import GameCanvas from './game/GameCanvas';
import MainMenu from './game/MainMenu';
import CreateRoom from './game/CreateRoom';
import JoinRoom from './game/JoinRoom';
import RoomLobby from './game/RoomLobby';
import useGameWebSocket from './game/useGameWebSocket';
import { GRID_SIZE, CELL_SIZE, INITIAL_SPEED, CAMERA_SMOOTHING, MIN_SNAKE_OPACITY, MINIMAP_SIZE, INACTIVE_PLAYER_OPACITY } from './game/gameConstants';

type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

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
    availableRooms,
    currentRoom,
    isReady,
    view,
    sendDirection,
    sendUpdate,
    sendSpeedBoost,
    startFreeRide,
    createRoom,
    joinRoom,
    leaveRoom,
    setPlayerReady,
    getRoomsList,
    setGameOver,
    setIsPlaying,
    setView
  } = useGameWebSocket();

  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  const [playerName, setPlayerName] = useState('');
  
  const gameLoop = useRef<number>();
  const lastKeyPress = useRef(0);
  const cameraPositionRef = useRef({ x: 0, y: 0 });
  const lastUpdateTime = useRef(0);
  const animationFrameRef = useRef<number>();

  const handleStartFreeRide = () => {
    if (!playerName.trim()) {
      toast.error("Please enter a name first!");
      return;
    }

    startFreeRide(playerName.trim());
  };

  const handleCreateRoom = (roomName: string, isPrivate: boolean, maxPlayers: number) => {
    console.log(`GameBoard: Creating room: ${roomName}, private: ${isPrivate}, maxPlayers: ${maxPlayers}`);
    if (!playerName.trim()) {
      toast.error("Please enter a name first!");
      return;
    }
    createRoom(roomName, isPrivate, maxPlayers);
  };

  const handleJoinRoom = (roomId: string, code?: string) => {
    joinRoom(roomId, code);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const handleSetReady = () => {
    setPlayerReady();
  };

  const handleDirection = (newDirection: Direction) => {
    const oppositeDirections = {
      'UP': 'DOWN',
      'DOWN': 'UP',
      'LEFT': 'RIGHT',
      'RIGHT': 'LEFT'
    };
    
    if (oppositeDirections[direction] === newDirection) {
      return;
    }

    if (direction !== newDirection) {
      setDirection(newDirection);
      sendDirection(newDirection);
      updateGame();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
    }

    const now = Date.now();
    if (now - lastKeyPress.current < 50) return;
    lastKeyPress.current = now;

    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        event.preventDefault();
        if (direction !== 'DOWN') {
          handleDirection('UP');
        }
        break;
      case 'arrowdown':
      case 's':
        event.preventDefault();
        if (direction !== 'UP') {
          handleDirection('DOWN');
        }
        break;
      case 'arrowleft':
      case 'a':
        event.preventDefault();
        if (direction !== 'RIGHT') {
          handleDirection('LEFT');
        }
        break;
      case 'arrowright':
      case 'd':
        event.preventDefault();
        if (direction !== 'LEFT') {
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
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ') {
      setIsSpeedBoostActive(false);
    }
  };

  const updateGame = () => {
    sendUpdate();

    if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage > 0) {
      sendSpeedBoost();
    } else if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage <= 0) {
      setIsSpeedBoostActive(false);
    }
  };

  useEffect(() => {
    if (!gameOver && playerId && isPlaying) {
      const speed = isSpeedBoostActive ? INITIAL_SPEED / 2 : INITIAL_SPEED;
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => clearInterval(gameLoop.current);
    }
  }, [gameOver, direction, isSpeedBoostActive, playerId, isPlaying]);

  const currentPlayer = players.find(p => p.id === playerId);
  const score = currentPlayer?.score || 0;
  const speedBoostPercentage = currentPlayer?.speedBoostPercentage || 0;

  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  const getViewportTransform = (snakeHead: Position) => {
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
  };

  const updateCamera = () => {
    if (currentPlayer?.snake?.[0]) {
      const container = document.querySelector('.game-container') as HTMLDivElement;
      if (container) {
        container.style.transform = getViewportTransform(currentPlayer.snake[0]);
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateCamera);
  };

  useEffect(() => {
    updateCamera();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [direction, currentPlayer?.speedBoostPercentage]);

  const renderView = () => {
    switch (view) {
      case 'menu':
        return (
          <MainMenu 
            playerName={playerName}
            setPlayerName={setPlayerName}
            onStartFreeRide={handleStartFreeRide}
            onCreateRoom={() => setView('createRoom')}
            onJoinRoom={() => setView('joinRoom')}
          />
        );
      case 'createRoom':
        return (
          <CreateRoom 
            onBack={() => setView('menu')}
            onCreateRoom={handleCreateRoom}
          />
        );
      case 'joinRoom':
        return (
          <JoinRoom 
            availableRooms={availableRooms}
            onBack={() => setView('menu')}
            onJoinRoom={handleJoinRoom}
            onRefreshRooms={getRoomsList}
          />
        );
      case 'room':
        return currentRoom && (
          <RoomLobby 
            room={currentRoom}
            playerId={playerId}
            isReady={isReady}
            onBack={handleLeaveRoom}
            onReady={handleSetReady}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/50 dark:from-gray-900 dark:to-gray-800">
      <ThemeToggle />

      {!isPlaying && !gameOver && renderView()}

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
      
      {isPlaying && !gameOver && (
        <>
          <PlayerScore score={score} />
          <Leaderboard players={players} playerId={playerId} />
          <SpeedBoost isSpeedBoostActive={isSpeedBoostActive} speedBoostPercentage={speedBoostPercentage} />
        </>
      )}

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

      {isPlaying && !gameOver && (
        <GameControls 
          handleDirection={handleDirection}
          speedBoostPercentage={speedBoostPercentage}
          setIsSpeedBoostActive={setIsSpeedBoostActive}
        />
      )}

      {gameOver && <GameOver score={score} />}
    </div>
  );
};

export default GameBoard;
