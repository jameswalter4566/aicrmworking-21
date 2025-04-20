
import React from "react";
import { Loader2 } from "lucide-react";

const Loading: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={48} className="animate-spin text-primary" />
    </div>
  );
};

export default Loading;
