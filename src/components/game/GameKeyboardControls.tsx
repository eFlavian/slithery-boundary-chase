
import { useEffect, useRef } from 'react';
import { Direction } from '@/lib/gameTypes';

type GameKeyboardControlsProps = {
  direction: Direction;
  setDirection: (direction: Direction) => void;
  sendDirection: (direction: Direction) => void;
  isSpeedBoostActive: boolean;
  setIsSpeedBoostActive: (active: boolean) => void;
  speedBoostPercentage: number;
  updateGame: () => void;
  isGameActive: boolean;
};

const GameKeyboardControls: React.FC<GameKeyboardControlsProps> = ({
  direction,
  setDirection,
  sendDirection,
  isSpeedBoostActive,
  setIsSpeedBoostActive,
  speedBoostPercentage,
  updateGame,
  isGameActive
}) => {
  const lastKeyPress = useRef(0);

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
    if (!isGameActive) return;
    
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
        if (speedBoostPercentage > 0) {
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

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [direction, speedBoostPercentage, isGameActive]);

  return null; // This is a non-visual component
};

export default GameKeyboardControls;
