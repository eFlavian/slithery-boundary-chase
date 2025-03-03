
import { useEffect, useRef, useState } from 'react';
import { Direction } from '@/utils/gameUtils';

type UseGameControlsProps = {
  sendDirection: (direction: Direction) => void;
  sendUpdate: () => void;
  currentPlayer?: any;
  isPlaying: boolean;
  gameOver: boolean;
};

const useGameControls = ({
  sendDirection,
  sendUpdate,
  currentPlayer,
  isPlaying,
  gameOver
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

  const sendSpeedBoost = () => {
    // This is handled directly by the useGameWebSocket hook
  };

  useEffect(() => {
    if (!gameOver && isPlaying) {
      const speed = isSpeedBoostActive ? 140 / 2 : 140;
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => clearInterval(gameLoop.current);
    }
  }, [gameOver, direction, isSpeedBoostActive, isPlaying]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [direction, currentPlayer?.speedBoostPercentage]);

  return {
    direction,
    isSpeedBoostActive,
    setIsSpeedBoostActive,
    handleDirection
  };
};

export default useGameControls;
