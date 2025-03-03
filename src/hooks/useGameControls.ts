import { useEffect, useRef, useState } from 'react';
import { Direction, getOppositeDirection } from '@/utils/gameUtils';

type UseGameControlsProps = {
  sendDirection: (direction: Direction) => void;
  sendUpdate: () => void;
  sendSpeedBoost?: () => void;
  currentPlayer?: any;
  isPlaying: boolean;
  gameOver: boolean;
  gameStatus: 'waiting' | 'countdown' | 'playing' | 'ended';
};

const useGameControls = ({
  sendDirection,
  sendUpdate,
  sendSpeedBoost,
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
    if (gameStatus !== 'playing') return;
    
    if (getOppositeDirection(direction) === newDirection) {
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

    if (gameStatus !== 'playing') return;

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
    if (gameStatus !== 'playing') return;
    
    sendUpdate();

    if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage > 0) {
      if (sendSpeedBoost) {
        sendSpeedBoost();
      }
    } else if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage <= 0) {
      setIsSpeedBoostActive(false);
    }
  };

  useEffect(() => {
    if (!gameOver && isPlaying && gameStatus === 'playing') {
      const snakeLength = currentPlayer?.snake?.length || 0;
      const baseSpeed = 140;
      
      const speedAdjustment = Math.min(1, 80 / Math.max(80, snakeLength));
      const speed = isSpeedBoostActive ? baseSpeed / 2 : baseSpeed;
      const adjustedSpeed = speed * speedAdjustment;
      
      const frameUpdate = () => {
        updateGame();
        gameLoop.current = window.setTimeout(() => {
          window.requestAnimationFrame(frameUpdate);
        }, adjustedSpeed);
      };
      
      window.requestAnimationFrame(frameUpdate);
      
      return () => {
        if (gameLoop.current) {
          clearTimeout(gameLoop.current);
        }
      };
    }
  }, [gameOver, direction, isSpeedBoostActive, isPlaying, gameStatus, currentPlayer?.snake?.length]);

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
