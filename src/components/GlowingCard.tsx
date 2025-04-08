
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
        border border-white/20 glowing-card ${gradient} ${delay}`,
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
      <div className="glow-icon">
        <div className="icon-circle">
          {icon}
        </div>
      </div>

      <h3 className="text-xl font-bold glow-text text-center z-10 relative">{title}</h3>
      <p className="text-sm text-white/90 mt-3 text-center z-10 relative">{description}</p>
    </div>
  );
};

export default GlowingCard;
