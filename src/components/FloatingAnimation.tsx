
import React from "react";
import FloatingCard from "./FloatingCard";

interface FloatingItemConfig {
  id: number;
  component: React.ReactNode;
  initialX: number;
  initialY: number;
  floatRadius?: number;
  floatSpeed?: number;
  delay?: number;
  rotateAmount?: number;
  className?: string;
  zIndex?: number;
}

interface FloatingAnimationProps {
  className?: string;
  items: FloatingItemConfig[];
}

const FloatingAnimation: React.FC<FloatingAnimationProps> = ({ 
  className = "", 
  items 
}) => {
  return (
    <div className={`relative ${className}`}>
      {items.map((item) => (
        <FloatingCard
          key={item.id}
          initialX={item.initialX}
          initialY={item.initialY}
          floatRadius={item.floatRadius}
          floatSpeed={item.floatSpeed}
          delay={item.delay}
          rotateAmount={item.rotateAmount}
          className={item.className}
          zIndex={item.zIndex}
        >
          {item.component}
        </FloatingCard>
      ))}
    </div>
  );
};

export default FloatingAnimation;
