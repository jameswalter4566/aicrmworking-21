
import React, { useState, useEffect, useRef } from "react";

interface FloatingCardProps {
  className?: string;
  children: React.ReactNode;
  initialX?: number; 
  initialY?: number;
  floatRadius?: number; // How far the card can float from its center position
  floatSpeed?: number; // Speed of the floating animation (lower is slower)
  delay?: number; // Delay before animation starts
  rotateAmount?: number; // Maximum rotation in degrees
  zIndex?: number;
}

const FloatingCard: React.FC<FloatingCardProps> = ({
  className = "",
  children,
  initialX = 0,
  initialY = 0,
  floatRadius = 15,
  floatSpeed = 0.003,
  delay = 0,
  rotateAmount = 3,
  zIndex = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  useEffect(() => {
    // Start with a delay if specified
    const timeout = setTimeout(() => {
      let startTime = Date.now();
      
      const animateFloat = () => {
        const elapsedTime = (Date.now() - startTime) * floatSpeed;
        
        // Use sine and cosine for smooth oscillations
        const newX = initialX + Math.sin(elapsedTime * 0.5) * floatRadius;
        const newY = initialY + Math.cos(elapsedTime * 0.7) * floatRadius;
        
        // Subtle rotation effect
        const rotX = Math.sin(elapsedTime * 0.3) * rotateAmount;
        const rotY = Math.cos(elapsedTime * 0.4) * rotateAmount;
        
        setPosition({ x: newX, y: newY });
        setRotation({ x: rotX, y: rotY });
        
        animationRef.current = requestAnimationFrame(animateFloat);
      };
      
      animationRef.current = requestAnimationFrame(animateFloat);
      
    }, delay);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(timeout);
    };
  }, [initialX, initialY, floatRadius, floatSpeed, delay, rotateAmount]);

  return (
    <div
      ref={ref}
      className={`absolute transition-transform ${className}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) 
                   rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        zIndex,
      }}
    >
      {children}
    </div>
  );
};

export default FloatingCard;
