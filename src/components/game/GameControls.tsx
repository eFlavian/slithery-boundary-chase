
import React, { memo, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface GameControlsProps {
  handleDirection: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  speedBoostPercentage: number;
  setIsSpeedBoostActive: (active: boolean) => void;
}

const GameControls: React.FC<GameControlsProps> = memo(({
  handleDirection,
  speedBoostPercentage,
  setIsSpeedBoostActive
}) => {
  // Memoize direction handlers to prevent recreating on each render
  const handleUp = useCallback(() => handleDirection('UP'), [handleDirection]);
  const handleDown = useCallback(() => handleDirection('DOWN'), [handleDirection]);
  const handleLeft = useCallback(() => handleDirection('LEFT'), [handleDirection]);
  const handleRight = useCallback(() => handleDirection('RIGHT'), [handleDirection]);
  
  const handleBoostStart = useCallback(() => {
    if (speedBoostPercentage > 0) setIsSpeedBoostActive(true);
  }, [speedBoostPercentage, setIsSpeedBoostActive]);
  
  const handleBoostEnd = useCallback(() => setIsSpeedBoostActive(false), [setIsSpeedBoostActive]);

  return (
    <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-64 h-64 z-[999]">
      <button
        className="absolute top-0 left-1/2 -translate-x-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
        onClick={handleUp}
        aria-label="Move Up"
      >
        <ArrowUp className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      </button>

      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
        onClick={handleLeft}
        aria-label="Move Left"
      >
        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      </button>

      <button
        className="absolute right-0 top-1/2 -translate-y-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
        onClick={handleRight}
        aria-label="Move Right"
      >
        <ArrowRight className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      </button>

      <button
        className="absolute bottom-0 left-1/2 -translate-x-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
        onClick={handleDown}
        aria-label="Move Down"
      >
        <ArrowDown className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      </button>

      <button
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-full ${
          speedBoostPercentage > 0
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
        } border-2 border-gray-300 dark:border-gray-600`}
        onTouchStart={handleBoostStart}
        onTouchEnd={handleBoostEnd}
        disabled={speedBoostPercentage <= 0}
        aria-label="Speed Boost"
      >
        BOOST
      </button>
    </div>
  );
});

GameControls.displayName = 'GameControls';

export default GameControls;
