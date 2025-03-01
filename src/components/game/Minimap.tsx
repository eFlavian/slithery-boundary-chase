
import React, { memo } from 'react';
import { Map } from 'lucide-react';

type MinimapProps = {
  isMinimapVisible: boolean;
  minimapTimeLeft: number;
  players: any[];
  foods: any[];
  yellowDots: any[];
  playerId: string | null;
  CELL_SIZE: number;
  MINIMAP_SIZE: number;
  GRID_SIZE: number;
};

// Memoized player marker component
const PlayerMarker = memo(({ player, isCurrentPlayer, scale, CELL_SIZE }: 
  { player: any, isCurrentPlayer: boolean, scale: number, CELL_SIZE: number }) => {
  if (!player.snake?.[0]) return null;
  
  return (
    <div
      key={`minimap-${player.id}`}
      className="absolute"
    >
      {isCurrentPlayer ? (
        <>
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] whitespace-nowrap text-blue-600 font-medium"
            style={{
              left: (player.snake[0].x * CELL_SIZE * scale),
              top: (player.snake[0].y * CELL_SIZE * scale) - 10,
            }}
          >
            {player.name}
          </div>
          <div
            className="absolute w-3 h-3 bg-blue-600"
            style={{
              left: (player.snake[0].x * CELL_SIZE * scale),
              top: (player.snake[0].y * CELL_SIZE * scale),
              transform: `translate(-50%, -50%) rotate(${
                player.direction === 'UP' ? '0deg' :
                player.direction === 'RIGHT' ? '90deg' :
                player.direction === 'DOWN' ? '180deg' : '-90deg'
              })`,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
            }}
          />
        </>
      ) : (
        <div
          className="absolute w-3 h-3 bg-red-600"
          style={{
            left: (player.snake[0].x * CELL_SIZE * scale),
            top: (player.snake[0].y * CELL_SIZE * scale),
            transform: `translate(-50%, -50%) rotate(${
              player.direction === 'UP' ? '0deg' :
              player.direction === 'RIGHT' ? '90deg' :
              player.direction === 'DOWN' ? '180deg' : '-90deg'
            })`,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
          }}
        />
      )}
    </div>
  );
});

// Main component
const Minimap: React.FC<MinimapProps> = ({
  isMinimapVisible,
  minimapTimeLeft,
  players,
  foods,
  yellowDots,
  playerId,
  CELL_SIZE,
  MINIMAP_SIZE,
  GRID_SIZE
}) => {
  if (!isMinimapVisible) return null;
  
  const scale = MINIMAP_SIZE / (GRID_SIZE * CELL_SIZE);
  const blinkClass = minimapTimeLeft <= 3 ? "animate-pulse" : "";
  
  // Only render a limited number of food dots on the minimap to save performance
  const limitedFoods = foods.slice(0, 20);
  const limitedYellowDots = yellowDots.slice(0, 10);

  return (
    <div 
      style={{ zIndex: 999 }} 
      className={`absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-3
        ${blinkClass}`}
    >
      {/* Timer display */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-white/70 font-medium">Minimap</div>
        <div className="text-xs text-white/90 font-semibold">{minimapTimeLeft}s</div>
      </div>

      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: MINIMAP_SIZE,
          height: MINIMAP_SIZE,
        }}
      >
        {/* Background grid - white background for light mode */}
        <div className="absolute inset-0 bg-white/90" />

        {/* Game elements */}
        {players.map(player => (
          <PlayerMarker 
            key={`player-${player.id}`}
            player={player} 
            isCurrentPlayer={player.id === playerId}
            scale={scale}
            CELL_SIZE={CELL_SIZE}
          />
        ))}

        {limitedFoods.map((food, index) => (
          <div
            key={`minimap-food-${index}`}
            className={`absolute w-1 h-1 rounded-full ${
              food.type === 'special' ? 'bg-purple-600' : 'bg-red-600'
            }`}
            style={{
              left: (food.x * CELL_SIZE * scale),
              top: (food.y * CELL_SIZE * scale),
            }}
          />
        ))}
        
        {limitedYellowDots.map((dot, index) => (
          <div
            key={`minimap-yellowdot-${index}`}
            className="absolute w-1 h-1 rounded-full bg-yellow-600"
            style={{
              left: (dot.x * CELL_SIZE * scale),
              top: (dot.y * CELL_SIZE * scale),
            }}
          />
        ))}

        {/* Grid overlay - darker gray for better visibility on white background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
            backgroundSize: `${MINIMAP_SIZE / 10}px ${MINIMAP_SIZE / 10}px`
          }}
        />
      </div>
    </div>
  );
};

export default memo(Minimap);
