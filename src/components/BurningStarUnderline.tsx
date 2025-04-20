
import React, { useEffect, useRef } from 'react';
import './BurningStarUnderline.css';

interface BurningStarUnderlineProps {
  width?: number;
}

const BurningStarUnderline = ({ width = 400 }: BurningStarUnderlineProps) => {
  const lineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.style.width = `${width}px`;
    }
    
    // Force a repaint to ensure animation starts
    if (containerRef.current) {
      containerRef.current.classList.add('animate-start');
      
      // Fade out after animation completes
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.classList.add('fade-out');
        }
      }, 3500); // 3s for animation + 0.5s buffer
    }
  }, [width]);

  return (
    <div className="burning-star-container" ref={containerRef}>
      <div className="burning-star-line" ref={lineRef}>
        <div className="star-head-left"></div>
        <div className="star-head-right"></div>
      </div>
    </div>
  );
};

export default BurningStarUnderline;
