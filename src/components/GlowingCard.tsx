
import React from "react";
import "./GlowingCard.css";
import { cn } from "@/lib/utils";

interface GlowingCardProps {
  title: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
  delay?: string;
  className?: string;
}

const GlowingCard = ({ 
  title, 
  description, 
  gradient, 
  icon,
  delay = "",
  className = ""
}: GlowingCardProps) => {
  return (
    <div
      className={cn(
        `relative p-6 pt-8 rounded-xl overflow-hidden backdrop-blur-lg text-white 
        border border-white/20 glowing-card h-full flex flex-col items-center text-center ${gradient} ${delay}`,
        className
      )}
    >
      {/* Diagonal beam of light effect - animated */}
      <div className="beam-of-light"></div>
      
      {/* Light ray effect */}
      <div className="light-ray"></div>
      
      {/* Shine effect - only activates on hover */}
      <div className="shine-overlay"></div>

      {/* Centered Glow Icon at the top */}
      <div className="glow-icon mb-4">
        <div className="icon-circle">
          {icon}
        </div>
      </div>

      <h3 className="text-xl font-bold glow-text mb-3 z-10 relative">{title}</h3>
      <p className="text-sm text-white/90 z-10 relative flex-grow">{description}</p>
    </div>
  );
};

export default GlowingCard;
