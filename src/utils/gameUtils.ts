
/**
 * Game utility functions
 */

export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export const GRID_SIZE = 256;
export const CELL_SIZE = 15;
export const INITIAL_SPEED = 140;
export const CAMERA_SMOOTHING = 0.55;
export const MIN_SNAKE_OPACITY = 0.3;
export const MINIMAP_SIZE = 150;
export const INACTIVE_PLAYER_OPACITY = 0.2;

export type Position = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export const getViewportTransform = (
  snakeHead: Position, 
  cameraPositionRef: React.MutableRefObject<Position>,
  lastUpdateTime: React.MutableRefObject<number>,
  CELL_SIZE: number
): string => {
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;

  const viewportCenterX = containerWidth / 2;
  const viewportCenterY = containerHeight / 2;

  const targetX = viewportCenterX - (snakeHead.x * CELL_SIZE);
  const targetY = viewportCenterY - (snakeHead.y * CELL_SIZE);

  const now = performance.now();
  const deltaTime = now - lastUpdateTime.current;
  lastUpdateTime.current = now;

  const smoothing = 1 - Math.exp(-CAMERA_SMOOTHING * (deltaTime / 1000)); // Exponential smoothing

  cameraPositionRef.current.x = lerp(cameraPositionRef.current.x, targetX, smoothing);
  cameraPositionRef.current.y = lerp(cameraPositionRef.current.y, targetY, smoothing);

  return `translate3d(${Math.round(cameraPositionRef.current.x)}px, ${Math.round(cameraPositionRef.current.y)}px, 0)`;
};

export const getOppositeDirection = (direction: Direction): Direction => {
  const oppositeDirections = {
    'UP': 'DOWN',
    'DOWN': 'UP',
    'LEFT': 'RIGHT',
    'RIGHT': 'LEFT'
  } as const;
  
  return oppositeDirections[direction];
};
