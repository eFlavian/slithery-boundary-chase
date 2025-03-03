
import React from 'react';
import { Position } from '@/utils/gameUtils';

type BattleRoyaleZoneProps = {
  radius: number;
  center: Position;
  CELL_SIZE: number;
  getViewportTransform: (position: Position) => string;
};

const BattleRoyaleZone: React.FC<BattleRoyaleZoneProps> = ({
  radius,
  center,
  CELL_SIZE,
  getViewportTransform
}) => {
  // Calculate pixel-based radius
  const radiusInPixels = radius * CELL_SIZE;
  
  return (
    <div 
      className="absolute rounded-full border-4 border-red-500/70 bg-red-500/10 pointer-events-none z-10"
      style={{
        width: radiusInPixels * 2,
        height: radiusInPixels * 2,
        left: center.x * CELL_SIZE - radiusInPixels,
        top: center.y * CELL_SIZE - radiusInPixels,
        transform: 'translate3d(0, 0, 0)',
        transition: 'width 1s linear, height 1s linear, left 1s linear, top 1s linear',
        boxShadow: '0 0 20px 10px rgba(239, 68, 68, 0.3)',
      }}
    />
  );
};

export default BattleRoyaleZone;
