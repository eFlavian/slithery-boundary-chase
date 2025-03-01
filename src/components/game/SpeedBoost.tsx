
import React from 'react';
import { Zap } from 'lucide-react';

type SpeedBoostProps = {
  isSpeedBoostActive: boolean;
  speedBoostPercentage: number;
};

const SpeedBoost: React.FC<SpeedBoostProps> = ({ isSpeedBoostActive, speedBoostPercentage }) => {
  const boostActive = isSpeedBoostActive && speedBoostPercentage > 0;
  
  return (
    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-[999]">
      <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20 flex flex-col items-center">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className={`w-4 h-4 ${boostActive ? 'text-yellow-400' : 'text-white/70'}`} />
          <div className="text-xs uppercase tracking-wider text-white/90 font-semibold">Boost</div>
        </div>
        
        <div className="relative h-[150px] w-6 bg-gray-900/60 rounded-full overflow-hidden mb-2">
          <div 
            className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ease-out ${
              boostActive ? 'bg-gradient-to-t from-yellow-500 to-blue-500 animate-pulse' : 'bg-gradient-to-t from-blue-400 to-blue-600'
            }`}
            style={{ height: `${speedBoostPercentage}%` }}
          />
          
          {/* Boost level markers */}
          <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
            {[0, 1, 2, 3, 4].map((_, i) => (
              <div key={i} className="w-full h-px bg-white/20" />
            ))}
          </div>
        </div>
        
        <div className="text-xs text-white text-center">
          {Math.round(speedBoostPercentage)}%
        </div>
        
        {boostActive && (
          <div className="text-xs text-yellow-400 font-semibold mt-1 animate-pulse">ACTIVE</div>
        )}
      </div>
    </div>
  );
};

export default SpeedBoost;
