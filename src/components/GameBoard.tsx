import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type FoodType = 'normal' | 'special';

const GRID_SIZE = 64;
const CELL_SIZE = 10;
const INITIAL_SPEED = 100;
const PORTAL_INTERVAL = 10000; // 10 seconds
const PORTAL_ACTIVE_DURATION = 5000; // 5 seconds
const SPEED_BOOST_INCREMENT = 25; // 25% per portal
const MAX_SPEED_BOOST = 100; // 100% maximum
const SPEED_CONSUMPTION_RATE = 0.5; // Consume 0.5% per game tick when holding spacebar

const GameBoard: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 32, y: 32 }]);
  const [food, setFood] = useState<Position & { type: FoodType }>({ x: 20, y: 20, type: 'normal' });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => 
    parseInt(localStorage.getItem('snakeHighScore') || '0')
  );
  const [portal, setPortal] = useState<Position | null>(null);
  const [speedBoostPercentage, setSpeedBoostPercentage] = useState(0);
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  const gameLoop = useRef<number>();
  const portalTimeout = useRef<number>();

  const generateRandomPosition = (): Position => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  });

  const generateFood = () => {
    const newFood = generateRandomPosition();
    if (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
        (portal && portal.x === newFood.x && portal.y === newFood.y)) {
      return generateFood();
    }
    return {
      ...newFood,
      type: Math.random() < 0.2 ? 'special' : 'normal' as FoodType
    };
  };

  const generatePortal = () => {
    if (gameOver || speedBoostPercentage >= MAX_SPEED_BOOST) return;
    
    const newPortal = generateRandomPosition();
    if (snake.some(segment => segment.x === newPortal.x && segment.y === newPortal.y) ||
        (food.x === newPortal.x && food.y === newPortal.y)) {
      return generatePortal();
    }
    
    setPortal(newPortal);
    toast("Speed Portal has appeared!", {
      duration: 3000,
    });

    portalTimeout.current = window.setTimeout(() => {
      setPortal(null);
    }, PORTAL_ACTIVE_DURATION);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        if (direction !== 'DOWN') setDirection('UP');
        break;
      case 'arrowdown':
      case 's':
        if (direction !== 'UP') setDirection('DOWN');
        break;
      case 'arrowleft':
      case 'a':
        if (direction !== 'RIGHT') setDirection('LEFT');
        break;
      case 'arrowright':
      case 'd':
        if (direction !== 'LEFT') setDirection('RIGHT');
        break;
      case ' ': // Spacebar press
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
    
    return snake.slice(0, -1).some(segment => 
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
        case 'UP':
          newHead.y -= 1;
          break;
        case 'DOWN':
          newHead.y += 1;
          break;
        case 'LEFT':
          newHead.x -= 1;
          break;
        case 'RIGHT':
          newHead.x += 1;
          break;
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
      
      if (portal && newHead.x === portal.x && newHead.y === portal.y) {
        setPortal(null);
        const newPercentage = Math.min(speedBoostPercentage + SPEED_BOOST_INCREMENT, MAX_SPEED_BOOST);
        setSpeedBoostPercentage(newPercentage);
        toast(`Speed Boost increased to ${newPercentage}%!`, {
          duration: 2000,
        });
      }

      if (newHead.x === food.x && newHead.y === food.y) {
        const points = food.type === 'special' ? 5 : 1;
        setScore(prev => prev + points);
        setFood(generateFood());
        
        if (food.type === 'special') {
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
    setSnake([{ x: 32, y: 32 }]);
    setFood(generateFood());
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setSpeedBoostPercentage(0);
    setIsSpeedBoostActive(false);
    setPortal(null);
    
    if (portalTimeout.current) {
      window.clearTimeout(portalTimeout.current);
    }
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

  useEffect(() => {
    if (!gameOver) {
      const interval = setInterval(() => {
        if (!portal) {
          generatePortal();
        }
      }, PORTAL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [gameOver, portal]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="relative mb-4 text-center">
        <div className="text-sm uppercase tracking-wide text-gray-500 mb-1">Score</div>
        <div className="text-4xl font-bold text-gray-800">{score}</div>
        <div className="text-sm text-gray-500 mt-1">High Score: {highScore}</div>
        <div className="w-48 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-100"
            style={{ width: `${speedBoostPercentage}%` }}
          />
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Speed Boost: {Math.round(speedBoostPercentage)}%
        </div>
        {isSpeedBoostActive && (
          <div className="text-sm text-blue-500 mt-2 animate-pulse">Speed Boost Active!</div>
        )}
      </div>

      <div 
        className="relative bg-white rounded-lg shadow-lg p-4 backdrop-blur-sm bg-opacity-90"
        style={{
          width: GRID_SIZE * CELL_SIZE + 32,
          height: GRID_SIZE * CELL_SIZE + 32,
        }}
      >
        <div 
          className="relative"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #00000005 1px, transparent 1px)',
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
          />

          {snake.map((segment, index) => (
            <div
              key={index}
              className="absolute bg-gray-800 rounded-sm transition-all duration-100"
              style={{
                width: CELL_SIZE - 1,
                height: CELL_SIZE - 1,
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
                opacity: index === 0 ? 1 : 0.8 - index * 0.1,
              }}
            />
          ))}

          <div
            className={`absolute rounded-full snake-food ${food.type === 'special' ? 'bg-purple-500' : 'bg-red-500'}`}
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
            }}
          />

          {portal && (
            <div
              className="absolute bg-blue-500 rounded-full animate-pulse"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                left: portal.x * CELL_SIZE,
                top: portal.y * CELL_SIZE,
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
              }}
            />
          )}
        </div>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 game-over">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over</h2>
            <p className="mb-4">Final Score: {score}</p>
            <button
              onClick={startGame}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
