
import { Position } from './gameTypes';
import { CELL_SIZE } from './gameConstants';

export const lerp = (start: number, end: number, t: number) => {
  return start + (end - start) * t;
};

export const getViewportTransform = (
  snakeHead: Position,
  cameraPosition: { x: number; y: number },
  smoothing: number
): { transform: string; newCameraPosition: { x: number; y: number } } => {
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;

  const viewportCenterX = containerWidth / 2;
  const viewportCenterY = containerHeight / 2;

  const targetX = viewportCenterX - (snakeHead.x * CELL_SIZE);
  const targetY = viewportCenterY - (snakeHead.y * CELL_SIZE);

  // Calculate smoothing based on performance.now() in the component
  const newX = lerp(cameraPosition.x, targetX, smoothing);
  const newY = lerp(cameraPosition.y, targetY, smoothing);

  const newCameraPosition = {
    x: newX,
    y: newY
  };

  return {
    transform: `translate3d(${Math.round(newX)}px, ${Math.round(newY)}px, 0)`,
    newCameraPosition
  };
};
