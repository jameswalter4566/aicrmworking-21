
import React, { useRef, useEffect, useState } from "react";

interface FloatingCardProps {
  children: React.ReactNode;
  initialX: number;
  initialY: number;
  floatRadius?: number;
  floatSpeed?: number;
  delay?: number;
  rotateAmount?: number;
  className?: string;
  zIndex?: number;
  isActive?: boolean;
}

const FloatingCard: React.FC<FloatingCardProps> = ({
  children,
  initialX,
  initialY,
  floatRadius = 20,
  floatSpeed = 0.0005, // Significantly slowed down from 0.002
  delay = 0,
  rotateAmount = 0,
  className = "",
  zIndex = 10,
  isActive = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: initialX * 1.5, y: initialY }); // Start from further away horizontally
  const [isVisible, setIsVisible] = useState(false);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now() + delay);
  const entryAnimationDone = useRef<boolean>(false);

  useEffect(() => {
    // Delay showing the element
    const visibilityTimer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    return () => {
      clearTimeout(visibilityTimer);
    };
  }, [delay]);

  useEffect(() => {
    if (!isActive) return;
    
    const animate = () => {
      if (!isActive) return;
      
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const entryDuration = 2000; // Entry animation duration in ms
      
      if (elapsed < entryDuration) {
        // During entry animation - move from outside to initial position
        const progress = elapsed / entryDuration;
        const easedProgress = easeOutQuart(progress);
        
        const targetX = initialX > 0 ? initialX : initialX;
        const startX = initialX > 0 ? initialX * 1.5 : initialX * 1.5;
        
        const x = startX + (targetX - startX) * easedProgress;
        const y = initialY;
        
        setCoords({ x, y });
      } else if (!entryAnimationDone.current) {
        // Entry animation just finished
        entryAnimationDone.current = true;
        setCoords({ x: initialX, y: initialY });
      } else {
        // Start gentle floating animation
        const floatingElapsed = elapsed - entryDuration;
        const angle = floatingElapsed * floatSpeed;
        
        const x = initialX + Math.cos(angle) * floatRadius;
        const y = initialY + Math.sin(angle) * floatRadius;
        
        setCoords({ x, y });
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [initialX, initialY, floatRadius, floatSpeed, isActive]);

  // Easing function for smooth entry
  const easeOutQuart = (x: number): number => {
    return 1 - Math.pow(1 - x, 4);
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: `translate(calc(${coords.x}px - 50%), calc(${coords.y}px - 50%))`,
    zIndex: zIndex,
    willChange: 'transform',
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 0.8s ease-out',
  };

  return (
    <div ref={cardRef} style={style} className={`${className}`}>
      {children}
    </div>
  );
};

export default React.memo(FloatingCard);
