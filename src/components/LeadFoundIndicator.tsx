
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface LeadFoundIndicatorProps {
  isVisible: boolean;
}

export const LeadFoundIndicator = ({ isVisible }: LeadFoundIndicatorProps) => {
  const [isShowing, setIsShowing] = useState(false);
  const [showCount, setShowCount] = useState(0);
  
  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      setShowCount(prev => prev + 1);
      const timer = setTimeout(() => setIsShowing(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);
  
  if (!isShowing) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg animate-bounce z-50 flex items-center gap-2">
      <CheckCircle2 className="h-5 w-5" />
      <div>
        <span className="font-medium">Lead Successfully Found!</span>
        {showCount > 1 && (
          <span className="text-xs ml-1">({showCount})</span>
        )}
      </div>
    </div>
  );
};
