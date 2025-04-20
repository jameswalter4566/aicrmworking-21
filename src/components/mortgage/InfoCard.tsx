
import React from 'react';

interface InfoCardProps {
  title: string;
  description: string;
}

const InfoCard = ({ title, description }: InfoCardProps) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
      <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
      <p className="text-blue-200 leading-relaxed">{description}</p>
    </div>
  );
};

export default InfoCard;
