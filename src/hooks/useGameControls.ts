
import { useEffect, useRef, useState } from 'react';
import { Direction } from '@/utils/gameUtils';

type UseGameControlsProps = {
  sendDirection: (direction: Direction) => void;
  sendUpdate: () => void;
  currentPlayer?: any;
  isPlaying: boolean;
  gameOver: boolean;
  gameStatus: 'waiting' | 'countdown' | 'playing' | 'ended'; // Add gameStatus to the type
};

const useGameControls = ({
  sendDirection,
  sendUpdate,
  currentPlayer,
  isPlaying,
  gameOver,
  gameStatus
}: UseGameControlsProps) => {
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  
  const lastKeyPress = useRef(0);
  const gameLoop = useRef<number>();

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
    // Don't process input if game is not in 'playing' status
    if (gameStatus !== 'playing') return;

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
    // Don't update the game if not in playing status
    if (gameStatus !== 'playing') return;
    
    sendUpdate();

    if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage > 0) {
      sendSpeedBoost();
    } else if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage <= 0) {
      setIsSpeedBoostActive(false);
    }
  };

  const sendSpeedBoost = () => {
    // This is handled directly by the useGameWebSocket hook
  };

  useEffect(() => {
    // Only start the game loop if we're in the 'playing' state
    if (!gameOver && isPlaying && gameStatus === 'playing') {
      const speed = isSpeedBoostActive ? 140 / 2 : 140;
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => clearInterval(gameLoop.current);
    } else if (gameLoop.current) {
      // If we're not playing, clear the interval
      clearInterval(gameLoop.current);
    }
  }, [gameOver, direction, isSpeedBoostActive, isPlaying, gameStatus]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [direction, currentPlayer?.speedBoostPercentage, gameStatus]);

  return {
    direction,
    isSpeedBoostActive,
    setIsSpeedBoostActive,
    handleDirection
  };
};

export default useGameControls;
