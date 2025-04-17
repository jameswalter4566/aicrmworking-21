
import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed";
}

interface ProcessingStatusContainerProps {
  steps: ProcessStep[];
  className?: string;
}

const ProcessingStatusContainer: React.FC<ProcessingStatusContainerProps> = ({
  steps,
  className
}) => {
  return (
    <Card className={cn("p-4 mb-4 bg-white/50 backdrop-blur-sm", className)}>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {step.status === "processing" ? (
              <Loader2 className="h-4 w-4 animate-spin text-mortgage-purple" />
            ) : step.status === "completed" ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4" />
            )}
            <span className={cn(
              "text-sm",
              step.status === "processing" && "text-mortgage-purple font-medium",
              step.status === "completed" && "text-green-600",
              step.status === "pending" && "text-gray-400"
            )}>
              {step.label}
            </span>
            {step.status === "processing" && (
              <Progress value={66} className="w-24 h-2" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ProcessingStatusContainer;
