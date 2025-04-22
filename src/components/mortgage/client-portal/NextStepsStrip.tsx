
import { Flag, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface NextStepsStripProps {
  loading?: boolean;
}

const NextStepsStrip = ({ loading = false }: NextStepsStripProps) => {
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
            <h4 className="font-medium text-mortgage-darkPurple mb-1">Next Steps</h4>
            <p className="text-sm text-gray-600">Upload your last 2 bank statements to expedite your application</p>
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
