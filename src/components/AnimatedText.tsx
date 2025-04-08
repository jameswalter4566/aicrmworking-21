
import React, { useState, useEffect } from "react";

interface AnimatedTextProps {
  texts: string[];
  interval?: number;
}

const AnimatedText: React.FC<AnimatedTextProps> = ({ texts, interval = 3000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

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
    <span className="relative inline-block min-w-52">
      <span 
        className={`absolute left-0 transition-all duration-500 ${
          isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        {texts[currentIndex]}
      </span>
    </span>
  );
};

export default AnimatedText;
