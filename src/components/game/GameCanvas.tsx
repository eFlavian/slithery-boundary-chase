
import React, { useRef, useEffect } from 'react';
import { Map, Zap } from 'lucide-react';

type Position = {
  x: number;
  y: number;
};

type GameCanvasProps = {
  players: any[];
  foods: any[];
  yellowDots: Position[];
  portals: Position[];
  playerId: string | null;
  CELL_SIZE: number;
  GRID_SIZE: number;
  MIN_SNAKE_OPACITY: number;
  INACTIVE_PLAYER_OPACITY: number;
  getViewportTransform: (snakeHead: Position) => string;
  currentPlayer: any;
  children?: React.ReactNode;
  gameStatus: 'waiting' | 'countdown' | 'playing' | 'ended';
};

const GameCanvas: React.FC<GameCanvasProps> = ({
  players,
  foods,
  yellowDots,
  portals,
  playerId,
  CELL_SIZE,
  GRID_SIZE,
  MIN_SNAKE_OPACITY,
  INACTIVE_PLAYER_OPACITY,
  getViewportTransform,
  currentPlayer,
  children,
  gameStatus
}) => {
  // Create hash pattern for the grid background
  const createHashPattern = () => {
    return (
      <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hash" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <path d="M0,10 l20,-20 M-5,5 l10,-10 M15,25 l10,-10"
                stroke="#1e1e1e"
                strokeWidth="2"
                opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hash)" />
        </svg>
      </div>
    );
  };

  // Determine if game has started (playing) to set ghost mode for players
  const isGameActive = gameStatus === 'playing';
  const ghostOpacity = 0.5; // Set ghost opacity for when game hasn't started

  useEffect(() => {
    console.log("GameCanvas - Game status changed to:", gameStatus);
    console.log("Ghost mode is " + (!isGameActive ? "ENABLED" : "DISABLED"));
  }, [gameStatus, isGameActive]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="relative w-full h-full">
        {createHashPattern()}
        <div
          className="absolute game-container"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
            transform: currentPlayer?.snake?.[0] ?
              getViewportTransform(currentPlayer.snake[0]) :
              'translate3d(0, 0, 0)',
            willChange: 'transform',
            transition: 'transform 150ms linear'
          }}
        >
          <div
            className="absolute"
            style={{
              backgroundColor: 'white',
              backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)',
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
              width: '100%',
              height: '100%',
            }}
          />

          {/* Battle Royale Zone */}
          {children}

          {/* Yellow dots with map icon */}
          {yellowDots.map((dot, index) => (
            <div
              key={`yellodot-${index}`}
              className="absolute rounded-full bg-yellow-500 animate-pulse flex items-center justify-center"
              style={{
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                left: dot.x * CELL_SIZE,
                top: dot.y * CELL_SIZE,
                transform: 'translate3d(0, 0, 0)',
              }}
            >
              <Map className="w-2 h-2 text-white" />
            </div>
          ))}

          {players.map(player => (
            player.snake.map((segment: Position, index: number) => (
              <div
                key={`${player.id}-${index}`}
                className={`absolute will-change-transform ${index === 0 ? 'z-20' : ''}`}
                style={{
                  width: CELL_SIZE - 1,
                  height: CELL_SIZE - 1,
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                  opacity: isGameActive ? 
                    (player.isPlaying ? 
                      Math.max(MIN_SNAKE_OPACITY, 1 - index * 0.1) : 
                      INACTIVE_PLAYER_OPACITY) : 
                    ghostOpacity, // Apply ghost opacity when game hasn't started
                  transform: 'translate3d(0, 0, 0)',
                  transition: 'all 150ms linear'
                }}
              >
                {index === 0 && (
                  <>
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap flex flex-col items-center">
                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 tracking-tight opacity-50">
                        {player.name}
                      </span>
                      <svg
                        className="w-2 h-2 text-gray-600 dark:text-gray-300 mt-0.5 opacity-50"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 10l-4-4h8l-4 4z" />
                      </svg>
                    </div>
                    <img
                      src="/defaultPic.webp"
                      alt="User"
                      className="w-full h-full rounded-sm object-cover"
                    />
                  </>
                )}
                {index > 0 && (
                  <div
                    className={`w-full h-full rounded-sm ${player.id === playerId ?
                      'bg-gray-800 dark:bg-gray-200' :
                      'bg-red-500 dark:bg-red-400'
                    }`}
                  />
                )}
              </div>
            ))
          ))}

          {foods.map((food, index) => (
            <div
              key={`food-${index}`}
              className={`absolute rounded-full snake-food will-change-transform ${
                food.type === 'special' ? 'bg-purple-500' : 'bg-red-500'
              }`}
              style={{
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
                transform: 'translate3d(0, 0, 0)',
              }}
            />
          ))}

          {/* Portals with lightning icon */}
          {portals.map((portal, index) => (
            <div
              key={`portal-${index}`}
              className="absolute bg-blue-500 rounded-full animate-pulse will-change-transform flex items-center justify-center"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                left: portal.x * CELL_SIZE,
                top: portal.y * CELL_SIZE,
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                transform: 'translate3d(0, 0, 0)',
              }}
            >
              <Zap className="w-2 h-2 text-white" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;
