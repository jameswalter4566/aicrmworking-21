
import React from 'react';

const WavySignals = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute w-full h-64 top-1/4 -translate-y-1/2">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 200">
          {/* First wave - lighter blue with glow effect */}
          <path
            d="M0 20 Q 150 10, 300 20 T 600 20 T 900 20 T 1200 20"
            className="animate-[moveWave_15s_linear_infinite] fill-none stroke-blue-400/30"
            style={{ 
              strokeWidth: '3px',
              filter: 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.5))'
            }}
          />
          
          {/* Second wave - medium blue with glow effect */}
          <path
            d="M0 50 Q 150 40, 300 50 T 600 50 T 900 50 T 1200 50"
            className="animate-[moveWave_20s_linear_infinite_reverse] fill-none stroke-blue-500/30" 
            style={{ 
              strokeWidth: '3px',
              filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
            }}
          />
          
          {/* Third wave - darker blue with glow effect */}
          <path
            d="M0 80 Q 150 70, 300 80 T 600 80 T 900 80 T 1200 80"
            className="animate-[moveWave_25s_linear_infinite] fill-none stroke-blue-600/30"
            style={{ 
              strokeWidth: '3px',
              filter: 'drop-shadow(0 0 10px rgba(37, 99, 235, 0.5))'
            }}
          />
        </svg>
      </div>
    </div>
  );
};

export default WavySignals;
