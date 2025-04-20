
import React, { useEffect, useRef } from 'react';
import './BurningStarUnderline.css';

interface BurningStarUnderlineProps {
  width?: number;
}

const BurningStarUnderline = ({ width = 400 }: BurningStarUnderlineProps) => {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.style.width = `${width}px`;
    }
  }, [width]);

  return (
    <div className="burning-star-container">
      <div className="burning-star-line" ref={lineRef}>
        <div className="star-head-left"></div>
        <div className="star-head-right"></div>
      </div>
    </div>
  );
};

export default BurningStarUnderline;
