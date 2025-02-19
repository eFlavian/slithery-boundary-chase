
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 64;
const CELL_SIZE = 10;
const INITIAL_SPEED = 100;

const GameBoard: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 32, y: 32 }]);
  const [food, setFood] = useState<Position>({ x: 20, y: 20 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => 
    parseInt(localStorage.getItem('snakeHighScore') || '0')
  );
  const gameLoop = useRef<number>();

  const generateFood = () => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // Make sure food doesn't spawn on snake
    if (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      return generateFood();
    }
    return newFood;
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        if (direction !== 'DOWN') setDirection('UP');
        break;
      case 'ArrowDown':
        if (direction !== 'UP') setDirection('DOWN');
        break;
      case 'ArrowLeft':
        if (direction !== 'RIGHT') setDirection('LEFT');
        break;
      case 'ArrowRight':
        if (direction !== 'LEFT') setDirection('RIGHT');
        break;
    }
  };

  const checkCollision = (head: Position): boolean => {
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    
    // Check self collision (excluding the tail which will move)
    return snake.slice(0, -1).some(segment => 
      segment.x === head.x && segment.y === head.y
    );
  };

  const updateGame = () => {
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
      
      // Check if snake ate food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(prev => prev + 1);
        setFood(generateFood());
        toast("Score: " + (score + 1), {
          duration: 1000,
        });
        return newSnake;
      }

      newSnake.pop(); // Remove tail if no food eaten
      return newSnake;
    });
  };

  const startGame = () => {
    setSnake([{ x: 32, y: 32 }]);
    setFood(generateFood());
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction]);

  useEffect(() => {
    if (!gameOver) {
      gameLoop.current = window.setInterval(updateGame, INITIAL_SPEED);
      return () => clearInterval(gameLoop.current);
    }
  }, [gameOver, direction]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="relative mb-4 text-center">
        <div className="text-sm uppercase tracking-wide text-gray-500 mb-1">Score</div>
        <div className="text-4xl font-bold text-gray-800">{score}</div>
        <div className="text-sm text-gray-500 mt-1">High Score: {highScore}</div>
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
          {/* Grid background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #00000005 1px, transparent 1px)',
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
          />

          {/* Snake */}
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

          {/* Food */}
          <div
            className="absolute bg-red-500 rounded-full snake-food"
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
            }}
          />
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
