
import { Flag, ArrowRight, Loader2, InfoIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NextStepsStripProps {
  loading?: boolean;
  leadData?: any;
  pitchDeckStatus?: "generated" | "missing" | "pending" | null;
  missingFields?: string[];
}

const NextStepsStrip = ({ 
  loading = false, 
  leadData = null,
  pitchDeckStatus = null,
  missingFields = [] 
}: NextStepsStripProps) => {
  
  // Generate a next step message based on data completeness
  const getNextStepMessage = () => {
    if (pitchDeckStatus === "generated") {
      return "Review your personalized mortgage proposal in the Documents section";
    }
    
    if (missingFields && missingFields.length > 0) {
      if (missingFields.includes("loanInformation.loanAmount")) {
        return "Complete your loan amount information to proceed with your application";
      } else if (missingFields.includes("propertyInformation.estimatedValue")) {
        return "Provide an estimated property value to enhance your mortgage proposal";
      } else if (missingFields.includes("borrower.monthlyIncome")) {
        return "Add your income information to get an accurate mortgage assessment";
      }
    }
    
    // Default message if no specific issues identified
    return "Upload your last 2 bank statements to expedite your application";
  };

  if (loading) {
    return (
      <Card className="mb-6 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-mortgage-purple" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-mortgage-lightPurple/20 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Flag className="h-5 w-5 text-mortgage-purple" />
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-mortgage-darkPurple mb-1">Next Steps</h4>
              {missingFields && missingFields.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-blue-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm font-medium">Complete these fields for a personalized mortgage proposal:</p>
                      <ul className="text-xs mt-1 list-disc pl-4">
                        {missingFields.map((field, index) => (
                          <li key={index}>{field.replace(/\./g, ' ')}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-gray-600">{getNextStepMessage()}</p>
          </div>
          <div className="flex-shrink-0">
            <ArrowRight className="h-5 w-5 text-mortgage-purple" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextStepsStrip;
