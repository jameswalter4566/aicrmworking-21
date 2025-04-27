
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface LeadFoundIndicatorProps {
  isVisible: boolean;
}

export const LeadFoundIndicator = ({ isVisible }: LeadFoundIndicatorProps) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg animate-bounce z-50 flex items-center gap-2">
      <AlertCircle className="h-5 w-5" />
      <span className="font-medium">Lead Successfully Found!</span>
    </div>
  );
};
