
import React, { useRef, useEffect, memo } from 'react';
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
};

// Memoized components for better performance
const GridBackground = memo(() => (
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
));

const YellowDot = memo(({ dot, CELL_SIZE }: { dot: Position, CELL_SIZE: number }) => (
  <div
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
));

const FoodItem = memo(({ food, CELL_SIZE }: { food: any, CELL_SIZE: number }) => (
  <div
    className={`absolute rounded-full snake-food ${
      food.type === 'special' ? 'bg-purple-500' : 'bg-red-500'
    }`}
    style={{
      width: CELL_SIZE - 2,
      height: CELL_SIZE - 2,
      left: food.x * CELL_SIZE,
      top: food.y * CELL_SIZE,
    }}
  />
));

const Portal = memo(({ portal, CELL_SIZE }: { portal: Position, CELL_SIZE: number }) => (
  <div
    className="absolute bg-blue-500 rounded-full animate-pulse flex items-center justify-center"
    style={{
      width: CELL_SIZE,
      height: CELL_SIZE,
      left: portal.x * CELL_SIZE,
      top: portal.y * CELL_SIZE,
      boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
    }}
  >
    <Zap className="w-2 h-2 text-white" />
  </div>
));

const SnakeSegment = memo(({ segment, index, player, playerId, CELL_SIZE, MIN_SNAKE_OPACITY, INACTIVE_PLAYER_OPACITY }: 
  { segment: Position, index: number, player: any, playerId: string | null, CELL_SIZE: number, MIN_SNAKE_OPACITY: number, INACTIVE_PLAYER_OPACITY: number }) => (
  <div
    className={`absolute will-change-transform ${index === 0 ? 'z-20' : ''}`}
    style={{
      width: CELL_SIZE - 1,
      height: CELL_SIZE - 1,
      left: segment.x * CELL_SIZE,
      top: segment.y * CELL_SIZE,
      opacity: player.isPlaying ? 
        Math.max(MIN_SNAKE_OPACITY, 1 - index * 0.1) : 
        INACTIVE_PLAYER_OPACITY,
      transform: 'translate3d(0, 0, 0)',
      transition: index === 0 ? 'all 150ms linear' : 'none',
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
          loading="lazy"
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
));

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
  currentPlayer
}) => {
  const renderCount = useRef(0);
  
  // Performance optimization - only render visible elements
  const isVisible = (pos: Position): boolean => {
    if (!currentPlayer?.snake?.[0]) return false;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const centerX = currentPlayer.snake[0].x;
    const centerY = currentPlayer.snake[0].y;
    
    const visibleRange = {
      minX: centerX - (viewportWidth / CELL_SIZE / 2) - 5,
      maxX: centerX + (viewportWidth / CELL_SIZE / 2) + 5,
      minY: centerY - (viewportHeight / CELL_SIZE / 2) - 5,
      maxY: centerY + (viewportHeight / CELL_SIZE / 2) + 5,
    };
    
    return (
      pos.x >= visibleRange.minX &&
      pos.x <= visibleRange.maxX &&
      pos.y >= visibleRange.minY &&
      pos.y <= visibleRange.maxY
    );
  };
  
  renderCount.current++;
  
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="relative w-full h-full">
        <GridBackground />
        <div
          className="absolute game-container"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
            transform: currentPlayer?.snake?.[0] ?
              getViewportTransform(currentPlayer.snake[0]) :
              'translate3d(0, 0, 0)',
            willChange: 'transform',
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

          {/* Yellow dots with map icon - only render visible ones */}
          {yellowDots.filter(isVisible).map((dot, index) => (
            <YellowDot key={`yellodot-${index}`} dot={dot} CELL_SIZE={CELL_SIZE} />
          ))}

          {/* Only render players' segments that are visible */}
          {players.map(player => (
            player.snake
              .filter((segment: Position, idx: number) => idx < 20 || isVisible(segment)) // Always render head and first segments
              .map((segment: Position, index: number) => (
                <SnakeSegment 
                  key={`${player.id}-${index}`}
                  segment={segment}
                  index={player.snake.indexOf(segment)}
                  player={player}
                  playerId={playerId}
                  CELL_SIZE={CELL_SIZE}
                  MIN_SNAKE_OPACITY={MIN_SNAKE_OPACITY}
                  INACTIVE_PLAYER_OPACITY={INACTIVE_PLAYER_OPACITY}
                />
              ))
          ))}

          {/* Only render visible food items */}
          {foods.filter(isVisible).map((food, index) => (
            <FoodItem key={`food-${index}`} food={food} CELL_SIZE={CELL_SIZE} />
          ))}

          {/* Only render visible portals */}
          {portals.filter(isVisible).map((portal, index) => (
            <Portal key={`portal-${index}`} portal={portal} CELL_SIZE={CELL_SIZE} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(GameCanvas);
