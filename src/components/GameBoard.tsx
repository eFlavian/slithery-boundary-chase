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
const CELL_SIZE = 10;
const INITIAL_SPEED = 150;
const INITIAL_FOOD_COUNT = 50;
const INITIAL_PORTAL_COUNT = 2;
const FOOD_SPAWN_INTERVAL = 5000; // 5 seconds
const PORTAL_SPAWN_INTERVAL = 20000; // 20 seconds
const SPEED_BOOST_INCREMENT = 25;
const MAX_SPEED_BOOST = 100;
const SPEED_CONSUMPTION_RATE = 0.5;
const VISIBLE_AREA_SIZE = 64;

const GameBoard: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [snake, setSnake] = useState<Position[]>([{ x: 128, y: 128 }]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => 
    parseInt(localStorage.getItem('snakeHighScore') || '0')
  );
  const [speedBoostPercentage, setSpeedBoostPercentage] = useState(0);
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  const gameLoop = useRef<number>();

  const generateRandomPosition = (): Position => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  });

  const isPositionOccupied = (pos: Position): boolean => {
    return (
      snake.some(segment => segment.x === pos.x && segment.y === pos.y) ||
      foods.some(food => food.x === pos.x && food.y === pos.y) ||
      portals.some(portal => portal.x === pos.x && portal.y === pos.y)
    );
  };

  const generateFood = (): FoodItem => {
    let newFood: Position;
    do {
      newFood = generateRandomPosition();
    } while (isPositionOccupied(newFood));

    return {
      ...newFood,
      type: Math.random() < 0.2 ? 'special' : 'normal'
    };
  };

  const generatePortal = (): Portal => {
    let newPortal: Position;
    do {
      newPortal = generateRandomPosition();
    } while (isPositionOccupied(newPortal));
    
    return newPortal;
  };

  const initializeFoodAndPortals = () => {
    const initialFoods: FoodItem[] = [];
    const initialPortals: Portal[] = [];

    for (let i = 0; i < INITIAL_FOOD_COUNT; i++) {
      initialFoods.push(generateFood());
    }

    for (let i = 0; i < INITIAL_PORTAL_COUNT; i++) {
      initialPortals.push(generatePortal());
    }

    setFoods(initialFoods);
    setPortals(initialPortals);
  };

  const handleDirection = (newDirection: Direction) => {
    switch (newDirection) {
      case 'UP':
        if (direction !== 'DOWN') setDirection('UP');
        break;
      case 'DOWN':
        if (direction !== 'UP') setDirection('DOWN');
        break;
      case 'LEFT':
        if (direction !== 'RIGHT') setDirection('LEFT');
        break;
      case 'RIGHT':
        if (direction !== 'LEFT') setDirection('RIGHT');
        break;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        handleDirection('UP');
        break;
      case 'arrowdown':
      case 's':
        handleDirection('DOWN');
        break;
      case 'arrowleft':
      case 'a':
        handleDirection('LEFT');
        break;
      case 'arrowright':
      case 'd':
        handleDirection('RIGHT');
        break;
      case ' ':
        if (speedBoostPercentage > 0) {
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

  const checkCollision = (head: Position): boolean => {
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    
    return snake.slice(4).some(segment => 
      segment.x === head.x && segment.y === head.y
    );
  };

  const updateGame = () => {
    if (isSpeedBoostActive && speedBoostPercentage > 0) {
      setSpeedBoostPercentage(prev => Math.max(0, prev - SPEED_CONSUMPTION_RATE));
      if (speedBoostPercentage <= 0) {
        setIsSpeedBoostActive(false);
        toast("Speed boost depleted!", {
          duration: 2000,
        });
      }
    }

    setSnake(prevSnake => {
      const newHead = { ...prevSnake[0] };

      switch (direction) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      if (checkCollision(newHead)) {
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('snakeHighScore', score.toString());
          toast("New High Score!");
        }
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      
      // Check portal collision
      const portalHit = portals.findIndex(portal => 
        portal.x === newHead.x && portal.y === newHead.y
      );

      if (portalHit !== -1) {
        setPortals(prev => prev.filter((_, index) => index !== portalHit));
        const newPercentage = Math.min(speedBoostPercentage + SPEED_BOOST_INCREMENT, MAX_SPEED_BOOST);
        setSpeedBoostPercentage(newPercentage);
        toast(`Speed Boost increased to ${newPercentage}%!`, {
          duration: 2000,
        });
      }

      // Check food collision
      const foodHit = foods.findIndex(food => 
        food.x === newHead.x && food.y === newHead.y
      );

      if (foodHit !== -1) {
        const eatenFood = foods[foodHit];
        setFoods(prev => prev.filter((_, index) => index !== foodHit));
        const points = eatenFood.type === 'special' ? 5 : 1;
        setScore(prev => prev + points);
        
        if (eatenFood.type === 'special') {
          for (let i = 0; i < 4; i++) {
            newSnake.push({ ...newSnake[newSnake.length - 1] });
          }
          toast("Special food! +5 points!", {
            duration: 1000,
          });
        } else {
          toast("Score: " + (score + 1), {
            duration: 1000,
          });
        }
        return newSnake;
      }

      newSnake.pop();
      return newSnake;
    });
  };

  const startGame = () => {
    setSnake([{ x: 128, y: 128 }]);
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setSpeedBoostPercentage(0);
    setIsSpeedBoostActive(false);
    initializeFoodAndPortals();
  };

  const createHashPattern = () => {
    const pattern = (
      <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
        <pattern id="hash" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none"/>
          <path d="M0,10 l20,-20 M-5,5 l10,-10 M15,25 l10,-10" 
                stroke="#ea384c" 
                strokeWidth="2" 
                opacity="0.5"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#hash)"/>
      </svg>
    );
    return pattern;
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [direction, speedBoostPercentage]);

  useEffect(() => {
    if (!gameOver) {
      const speed = isSpeedBoostActive ? INITIAL_SPEED / 2 : INITIAL_SPEED;
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => clearInterval(gameLoop.current);
    }
  }, [gameOver, direction, isSpeedBoostActive]);

  // Food spawn interval
  useEffect(() => {
    if (!gameOver) {
      const foodInterval = setInterval(() => {
        setFoods(prev => [...prev, generateFood()]);
      }, FOOD_SPAWN_INTERVAL);
      return () => clearInterval(foodInterval);
    }
  }, [gameOver]);

  // Portal spawn interval
  useEffect(() => {
    if (!gameOver) {
      const portalInterval = setInterval(() => {
        setPortals(prev => [...prev, generatePortal()]);
      }, PORTAL_SPAWN_INTERVAL);
      return () => clearInterval(portalInterval);
    }
  }, [gameOver]);

  // Initialize game
  useEffect(() => {
    startGame();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/50 dark:from-gray-900 dark:to-gray-800">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 right-4 p-2 rounded-lg bg-gray-200/80 dark:bg-gray-700/80 border-2 border-gray-300 dark:border-gray-600"
      >
        {theme === 'dark' ? (
          <Sun className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        ) : (
          <Moon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        )}
      </button>

      <div className="relative mb-4 text-center w-full max-w-lg">
        <div className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Score</div>
        <div className="text-4xl font-bold text-gray-800 dark:text-white">{score}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">High Score: {highScore}</div>
        <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-4 overflow-hidden">
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

      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border-2 border-gray-300 dark:border-gray-600 overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '90vmin',
          height: '90vmin',
        }}
      >
        <div className="relative border-2 border-gray-200 dark:border-gray-700 w-full h-full overflow-hidden">
          <div
            className="absolute transition-all duration-150 ease-linear"
            style={{
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              transform: `translate(${-snake[0].x * CELL_SIZE + (90 * Math.min(window.innerWidth, window.innerHeight) / 100) / 2}px, ${-snake[0].y * CELL_SIZE + (90 * Math.min(window.innerWidth, window.innerHeight) / 100) / 2}px)`,
            }}
          >
            {createHashPattern()}

            <div
              className="absolute"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)',
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                width: '100%',
                height: '100%',
              }}
            />

            {snake.map((segment, index) => (
              <div
                key={index}
                className={`absolute transition-all duration-150 ease-linear ${
                  index === 0 ? 'z-20' : ''
                }`}
                style={{
                  width: CELL_SIZE - 1,
                  height: CELL_SIZE - 1,
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                  opacity: index === 0 ? 1 : 0.8 - index * 0.1,
                }}
              >
                {index === 0 ? (
                  <>
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap flex flex-col items-center">
                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 tracking-tight opacity-50">
                        User1
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
                      src="/placeholder.svg"
                      alt="User"
                      className="w-full h-full rounded-sm object-cover"
                    />
                  </>
                ) : (
                  <div 
                    className="w-full h-full bg-gray-800 dark:bg-gray-200 rounded-sm"
                  />
                )}
              </div>
            ))}

            {foods.map((food, index) => (
              <div
                key={`food-${index}`}
                className={`absolute rounded-full snake-food ${food.type === 'special' ? 'bg-purple-500' : 'bg-red-500'}`}
                style={{
                  width: CELL_SIZE - 2,
                  height: CELL_SIZE - 2,
                  left: food.x * CELL_SIZE,
                  top: food.y * CELL_SIZE,
                }}
              />
            ))}

            {portals.map((portal, index) => (
              <div
                key={`portal-${index}`}
                className="absolute bg-blue-500 rounded-full animate-pulse"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: portal.x * CELL_SIZE,
                  top: portal.y * CELL_SIZE,
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
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
            speedBoostPercentage > 0 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          } border-2 border-gray-300 dark:border-gray-600`}
          onTouchStart={() => {
            if (speedBoostPercentage > 0) setIsSpeedBoostActive(true);
          }}
          onTouchEnd={() => setIsSpeedBoostActive(false)}
        >
          BOOST
        </button>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 game-over">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Game Over</h2>
            <p className="mb-4 dark:text-gray-300">Final Score: {score}</p>
            <button
              onClick={startGame}
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
