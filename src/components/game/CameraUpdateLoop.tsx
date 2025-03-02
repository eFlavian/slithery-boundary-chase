
import { useEffect, useRef } from 'react';
import { Position } from '@/lib/gameTypes';
import { CAMERA_SMOOTHING, CELL_SIZE } from '@/lib/gameConstants';
import { getViewportTransform } from '@/lib/cameraUtils';

type CameraUpdateLoopProps = {
  isActive: boolean;
  currentPlayerHead: Position | undefined;
  cameraPositionRef: React.MutableRefObject<{ x: number; y: number }>;
};

const CameraUpdateLoop: React.FC<CameraUpdateLoopProps> = ({
  isActive,
  currentPlayerHead,
  cameraPositionRef
}) => {
  const animationFrameRef = useRef<number>();
  const lastUpdateTime = useRef(0);

  const updateCamera = () => {
    if (currentPlayerHead) {
      const now = performance.now();
      const deltaTime = now - lastUpdateTime.current;
      lastUpdateTime.current = now;

      const smoothing = 1 - Math.exp(-CAMERA_SMOOTHING * (deltaTime / 1000)); // Exponential smoothing

      const container = document.querySelector('.game-container') as HTMLDivElement;
      if (container) {
        const { transform, newCameraPosition } = getViewportTransform(
          currentPlayerHead,
          cameraPositionRef.current,
          smoothing
        );
        
        container.style.transform = transform;
        cameraPositionRef.current = newCameraPosition;
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateCamera);
  };

  useEffect(() => {
    if (isActive) {
      updateCamera();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, currentPlayerHead]);

  return null; // This is a non-visual component
};

export default CameraUpdateLoop;
