
import { useEffect, useRef } from 'react';
import { Position, getViewportTransform } from '@/utils/gameUtils';

const useGameCamera = (currentPlayer: any, CELL_SIZE: number) => {
  const cameraPositionRef = useRef<Position>({ x: 0, y: 0 });
  const lastUpdateTime = useRef(0);
  const animationFrameRef = useRef<number>();

  const updateCamera = () => {
    if (currentPlayer?.snake?.[0]) {
      const container = document.querySelector('.game-container') as HTMLDivElement;
      if (container) {
        container.style.transform = getViewportTransform(
          currentPlayer.snake[0],
          cameraPositionRef,
          lastUpdateTime,
          CELL_SIZE
        );
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateCamera);
  };

  useEffect(() => {
    updateCamera();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentPlayer?.snake?.[0]) {
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      cameraPositionRef.current = {
        x: containerWidth / 2 - (currentPlayer.snake[0].x * CELL_SIZE),
        y: containerHeight / 2 - (currentPlayer.snake[0].y * CELL_SIZE)
      };
    }
  }, [currentPlayer?.id]);

  return {
    cameraPositionRef,
    lastUpdateTime,
    getTransform: (snakeHead: Position) => getViewportTransform(
      snakeHead,
      cameraPositionRef,
      lastUpdateTime,
      CELL_SIZE
    )
  };
};

export default useGameCamera;
