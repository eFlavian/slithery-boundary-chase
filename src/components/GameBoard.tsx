import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type FoodType = 'normal' | 'special';

type FoodItem = Position & { type: FoodType };
type Portal = Position;

const GRID_SIZE = 256;
const CELL_SIZE = 15;
const INITIAL_SPEED = 150;
const MIN_SNAKE_OPACITY = 0.3;
const MINIMAP_SIZE = 150;

const GameBoard: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const gameLoop = useRef<number>();

  const connectToServer = () => {
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      console.log('Connected to server');
      toast('Connected to game server');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'init':
          setPlayerId(message.data.playerId);
          break;

        case 'gameState':
          setPlayers(message.data.players);
          setFoods(message.data.foods);
          setPortals(message.data.portals);
          break;

        case 'playerDeath':
          toast(message.data.message);
          break;

        case 'gameOver':
          setGameOver(true);
          toast.error(`Game Over! ${message.data.message}`);
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      toast('Disconnected from game server');
    };

    wsRef.current = ws;
  };

  const handleDirection = (newDirection: Direction) => {
    setDirection(newDirection);
    wsRef.current?.send(JSON.stringify({
      type: 'direction',
      direction: newDirection,
      playerId
    }));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
    }

    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        event.preventDefault();
        handleDirection('UP');
        break;
      case 'arrowdown':
      case 's':
        event.preventDefault();
        handleDirection('DOWN');
        break;
      case 'arrowleft':
      case 'a':
        event.preventDefault();
        handleDirection('LEFT');
        break;
      case 'arrowright':
      case 'd':
        event.preventDefault();
        handleDirection('RIGHT');
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
    if (event.key === ' ') { // Spacebar release
      setIsSpeedBoostActive(false);
    }
  };

  const updateGame = () => {
    if (!wsRef.current || gameOver) return;

    wsRef.current.send(JSON.stringify({
      type: 'update',
      playerId
    }));

    if (isSpeedBoostActive) {
      wsRef.current.send(JSON.stringify({
        type: 'speedBoost',
        playerId
      }));
    }
  };

  useEffect(() => {
    connectToServer();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    if (!gameOver && playerId) {
      const speed = isSpeedBoostActive ? INITIAL_SPEED / 2 : INITIAL_SPEED;
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => clearInterval(gameLoop.current);
    }
  }, [gameOver, direction, isSpeedBoostActive, playerId]);

  const currentPlayer = players.find(p => p.id === playerId);
  const score = currentPlayer?.score || 0;
  const speedBoostPercentage = currentPlayer?.speedBoostPercentage || 0;

  const createHashPattern = () => {
    return (
      <div className="absolute inset-0 w-full h-full" style={{ backgroundColor:'rgba(30,30,30,0.2)' }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hash" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none"/>
              <path d="M0,10 l20,-20 M-5,5 l10,-10 M15,25 l10,-10" 
                    stroke="#1e1e1e" 
                    strokeWidth="2" 
                    opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hash)"/>
        </svg>
      </div>
    );
  };

  const getViewportTransform = (snakeHead: Position) => {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    
    const viewportCenterX = containerWidth / 2;
    const viewportCenterY = containerHeight / 2;
    
    const translateX = viewportCenterX - (snakeHead.x * CELL_SIZE);
    const translateY = viewportCenterY - (snakeHead.y * CELL_SIZE);
    
    return `translate3d(${translateX}px, ${translateY}px, 0)`;
  };

  const renderMinimap = () => {
    const scale = MINIMAP_SIZE / (GRID_SIZE * CELL_SIZE);
    
    return (
      <div style={{zIndex:999}} className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-2 border-2 border-gray-300 dark:border-gray-600 shadow-lg">
        <div 
          className="relative"
          style={{
            width: MINIMAP_SIZE,
            height: MINIMAP_SIZE,
          }}
        >
          {players.map(player => {
            const isCurrentPlayer = player.id === playerId;
            return (
              <div
                key={`minimap-${player.id}`}
                className="absolute"
              >
                {isCurrentPlayer ? (
                  <>
                    <div 
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] whitespace-nowrap text-blue-500 font-medium"
                      style={{
                        left: (player.snake[0].x * CELL_SIZE * scale),
                        top: (player.snake[0].y * CELL_SIZE * scale) - 10,
                      }}
                    >
                      {player.name}
                    </div>
                    <div
                      className="absolute w-3 h-3 bg-blue-500"
                      style={{
                        left: (player.snake[0].x * CELL_SIZE * scale),
                        top: (player.snake[0].y * CELL_SIZE * scale),
                        transform: `translate(-50%, -50%) rotate(${
                          player.direction === 'UP' ? '0deg' :
                          player.direction === 'RIGHT' ? '90deg' :
                          player.direction === 'DOWN' ? '180deg' :
                          '-90deg'
                        })`,
                        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="absolute w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: (player.snake[0].x * CELL_SIZE * scale),
                      top: (player.snake[0].y * CELL_SIZE * scale),
                    }}
                  />
                )}
              </div>
            );
          })}

          {foods.map((food, index) => (
            <div
              key={`minimap-food-${index}`}
              className={`absolute w-1 h-1 rounded-full ${
                food.type === 'special' ? 'bg-purple-500' : 'bg-red-500'
              }`}
              style={{
                left: (food.x * CELL_SIZE * scale),
                top: (food.y * CELL_SIZE * scale),
              }}
            />
          ))}

          <div 
            className="absolute border border-gray-300 dark:border-gray-600"
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      </div>
    );
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [direction, currentPlayer?.speedBoostPercentage]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/50 dark:from-gray-900 dark:to-gray-800">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 left-4 p-2 rounded-lg bg-gray-200/80 dark:bg-gray-700/80 border-2 border-gray-300 dark:border-gray-600"
      >
        {theme === 'dark' ? (
          <Sun className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        ) : (
          <Moon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        )}
      </button>

      {renderMinimap()}

      <div className="absolute mb-4 text-center w-full max-w-lg" style={{top:0, zIndex:999}}>
        <div className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Score</div>
        <div className="text-4xl font-bold text-gray-800 dark:text-white">{score}</div>
        
        <div className="mt-4 bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Leaderboard</h3>
          {players
            .sort((a, b) => b.score - a.score)
            .map(player => (
              <div 
                key={player.id} 
                className={`flex justify-between items-center py-1 ${
                  player.id === playerId ? 'text-blue-500 font-semibold' : ''
                }`}
              >
                <span>{player.name}</span>
                <span>{player.score}</span>
              </div>
            ))
          }
        </div>

        <div className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${speedBoostPercentage}%` }}
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Speed Boost: {Math.round(speedBoostPercentage)}%
          </div>
          {isSpeedBoostActive && (
            <div className="text-sm text-blue-500 mt-2 animate-pulse">Speed Boost Active!</div>
          )}
        </div>
      </div>

      <div className="fixed inset-0 bg-white dark:bg-gray-800 overflow-hidden will-change-transform">
        <div className="relative w-full h-full">
          {createHashPattern()}
          <div
            className="absolute"
            style={{
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              transform: currentPlayer?.snake?.[0] ? 
                getViewportTransform(currentPlayer.snake[0]) :
                'translate3d(0, 0, 0)',
              transition: 'transform 150ms linear',
              willChange: 'transform'
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

            {players.map(player => (
              player.snake.map((segment: Position, index: number) => (
                <div
                  key={`${player.id}-${index}`}
                  className={`absolute will-change-transform ${
                    index === 0 ? 'z-20' : ''
                  }`}
                  style={{
                    width: CELL_SIZE - 1,
                    height: CELL_SIZE - 1,
                    left: segment.x * CELL_SIZE,
                    top: segment.y * CELL_SIZE,
                    opacity: Math.max(MIN_SNAKE_OPACITY, 1 - index * 0.1),
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
                          <path d="M8 10l-4-4h8l-4 4z"/>
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
                      className={`w-full h-full rounded-sm ${
                        player.id === playerId ? 
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

            {portals.map((portal, index) => (
              <div
                key={`portal-${index}`}
                className="absolute bg-blue-500 rounded-full animate-pulse will-change-transform"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: portal.x * CELL_SIZE,
                  top: portal.y * CELL_SIZE,
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                  transform: 'translate3d(0, 0, 0)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-64 h-64">
        <button
          className="absolute top-0 left-1/2 -translate-x-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
          onClick={() => handleDirection('UP')}
        >
          <ArrowUp className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>
        
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
          onClick={() => handleDirection('LEFT')}
        >
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>
        
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
          onClick={() => handleDirection('RIGHT')}
        >
          <ArrowRight className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>
        
        <button
          className="absolute bottom-0 left-1/2 -translate-x-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
          onClick={() => handleDirection('DOWN')}
        >
          <ArrowDown className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>

        <button
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-full ${
            currentPlayer?.speedBoostPercentage > 0 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          } border-2 border-gray-300 dark:border-gray-600`}
          onTouchStart={() => {
            if (currentPlayer?.speedBoostPercentage > 0) setIsSpeedBoostActive(true);
          }}
          onTouchEnd={() => setIsSpeedBoostActive(false)}
        >
          BOOST
        </button>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Game Over</h2>
            <p className="mb-4 dark:text-gray-300">Final Score: {score}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
