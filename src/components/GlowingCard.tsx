
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
        `relative p-6 rounded-xl overflow-hidden backdrop-blur-lg text-white 
        border border-white/20 glowing-card ${gradient} ${delay}`,
        className
      )}
    >
      {/* Shine effect */}
      <div className="shine-overlay"></div>

      {/* Glow Icon */}
      <div className="mb-4 glow-icon">{icon}</div>

      <h3 className="text-xl font-bold glow-text">{title}</h3>
      <p className="text-sm text-white/90 mt-2">{description}</p>
    </div>
  );
};

export default GlowingCard;
