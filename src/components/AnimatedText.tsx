
import React, { useState, useEffect } from "react";

interface AnimatedTextProps {
  texts: string[];
  interval?: number;
  colors?: string[];
}

const AnimatedText: React.FC<AnimatedTextProps> = ({ 
  texts, 
  interval = 3000,
  colors = ["text-crm-blue", "text-purple-500", "text-orange-500"] 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Ensure we have enough colors for all texts
  const getTextColor = (index: number) => {
    return colors[index % colors.length];
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
        setIsAnimating(false);
      }, 500); // Animation duration
    }, interval);

    return () => clearInterval(timer);
  }, [texts, interval]);

  return (
    <div className="inline-block min-w-[300px] h-10 relative">
      <span 
        className={`absolute top-0 left-0 w-full transition-all duration-500 ${
          getTextColor(currentIndex)
        } ${
          isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        {texts[currentIndex]}
      </span>
    </div>
  );
};

export default AnimatedText;
