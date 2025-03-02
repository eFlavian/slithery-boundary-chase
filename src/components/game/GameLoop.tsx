
import { useEffect, useRef } from 'react';
import { INITIAL_SPEED } from '@/lib/gameConstants';

type GameLoopProps = {
  isGameActive: boolean;
  isSpeedBoostActive: boolean;
  updateGame: () => void;
};

const GameLoop: React.FC<GameLoopProps> = ({
  isGameActive,
  isSpeedBoostActive,
  updateGame
}) => {
  const gameLoop = useRef<number>();

  useEffect(() => {
    if (isGameActive) {
      const speed = isSpeedBoostActive ? INITIAL_SPEED / 2 : INITIAL_SPEED;
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => {
        if (gameLoop.current) clearInterval(gameLoop.current);
      };
    }
  }, [isGameActive, isSpeedBoostActive, updateGame]);

  return null; // This is a non-visual component
};

export default GameLoop;
