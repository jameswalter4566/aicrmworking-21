
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
  floatSpeed = 0.002,
  delay = 0,
  rotateAmount = 0,
  className = "",
  zIndex = 10,
  isActive = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: initialX, y: initialY });
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now() + delay);

  useEffect(() => {
    if (!isActive) return;
    
    const animate = () => {
      if (!isActive) return;
      
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const angle = elapsed * floatSpeed;
      
      const x = initialX + Math.cos(angle) * floatRadius;
      const y = initialY + Math.sin(angle) * floatRadius;
      
      setCoords({ x, y });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [initialX, initialY, floatRadius, floatSpeed, isActive]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: `translate(calc(${coords.x}px - 50%), calc(${coords.y}px - 50%))`,
    zIndex: zIndex,
    willChange: 'transform',
  };

  return (
    <div ref={cardRef} style={style} className={`transition-opacity duration-500 ${className}`}>
      {children}
    </div>
  );
};

export default React.memo(FloatingCard);
