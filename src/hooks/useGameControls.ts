
import { useEffect, useRef, useState } from 'react';
import { Direction } from '@/utils/gameUtils';

type UseGameControlsProps = {
  sendDirection: (direction: Direction) => void;
  sendUpdate: () => void;
  currentPlayer?: any;
  isPlaying: boolean;
  gameOver: boolean;
  gameStatus: 'waiting' | 'countdown' | 'playing' | 'ended'; // Add gameStatus
};

const useGameControls = ({
  sendDirection,
  sendUpdate,
  currentPlayer,
  isPlaying,
  gameOver,
  gameStatus // Include gameStatus in props
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
    
    // Only allow direction changes if the game is actually playing
    if (gameStatus !== 'playing') {
      return;
    }
    
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
    // Prevent default actions for arrow keys to avoid page scrolling
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
    }

    // Don't process key events too quickly (debounce)
    const now = Date.now();
    if (now - lastKeyPress.current < 50) return;
    lastKeyPress.current = now;
    
    // Only process key events if the game is playing or in countdown mode
    if (gameStatus !== 'playing' && gameStatus !== 'countdown') {
      return;
    }

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
        if (currentPlayer?.speedBoostPercentage > 0 && gameStatus === 'playing') {
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
    // Only send updates if the game is actually playing (not in countdown)
    if (gameStatus !== 'playing') {
      return;
    }
    
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
    // Only run the game loop if we're not in a transition state (game over or countdown)
    if (!gameOver && gameStatus === 'playing') {
      console.log("Starting game loop - game is actively playing");
      const speed = isSpeedBoostActive ? 140 / 2 : 140;
      
      // Clear existing interval before setting a new one
      if (gameLoop.current) {
        clearInterval(gameLoop.current);
      }
      
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => clearInterval(gameLoop.current);
    } else {
      // Clear the interval when not actively playing
      if (gameLoop.current) {
        console.log("Clearing game loop - game is not actively playing");
        clearInterval(gameLoop.current);
      }
    }
  }, [gameOver, direction, isSpeedBoostActive, gameStatus]);

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
