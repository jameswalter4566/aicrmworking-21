
import React from 'react';

const WavySignals = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-24 overflow-hidden pointer-events-none z-0">
      <svg className="absolute w-[200%] h-full" preserveAspectRatio="none">
        {/* First wave - lighter blue */}
        <path
          d="M-100 20 Q 0 0, 100 20 T 300 20 T 500 20 T 700 20 T 900 20 T 1100 20"
          className="translate-x-full animate-[moveWave_15s_linear_infinite] fill-none stroke-blue-400/20"
          style={{ strokeWidth: '2px' }}
        />
        {/* Second wave - medium blue */}
        <path
          d="M-100 40 Q 0 20, 100 40 T 300 40 T 500 40 T 700 40 T 900 40 T 1100 40"
          className="translate-x-full animate-[moveWave_20s_linear_infinite] fill-none stroke-blue-500/20"
          style={{ strokeWidth: '2px' }}
        />
        {/* Third wave - darker blue */}
        <path
          d="M-100 60 Q 0 40, 100 60 T 300 60 T 500 60 T 700 60 T 900 60 T 1100 60"
          className="translate-x-full animate-[moveWave_25s_linear_infinite] fill-none stroke-blue-600/20"
          style={{ strokeWidth: '2px' }}
        />
      </svg>
    </div>
  );
};

export default WavySignals;
