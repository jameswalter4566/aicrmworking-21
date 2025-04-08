
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
    // Clear any existing intervals to prevent memory leaks
    const timer = setInterval(() => {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
        setIsAnimating(false);
      }, 500); // Animation duration
    }, interval);

    return () => clearInterval(timer);
  }, [texts.length, interval]); // Add texts.length as dependency

  return (
    <div className="h-16 relative w-full">
      <h2 
        className={`text-3xl md:text-5xl font-bold transition-all duration-500 ${
          getTextColor(currentIndex)
        } ${
          isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        {texts[currentIndex]}
      </h2>
    </div>
  );
};

export default AnimatedText;
