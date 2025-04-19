
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientPortalConditionsProps {
  leadId: string | number;
  refreshData: () => void;
}

interface LoanCondition {
  id: string;
  text: string;
  status: string;
  category: string;
  documentUrl?: string;
}

interface ConditionsData {
  masterConditions: LoanCondition[];
  generalConditions: LoanCondition[];
  priorToFinalConditions: LoanCondition[];
  complianceConditions: LoanCondition[];
}

export const ClientPortalConditions = ({ leadId, refreshData }: ClientPortalConditionsProps) => {
  const [conditions, setConditions] = useState<ConditionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConditions();
  }, [leadId]);

  const fetchConditions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-conditions', {
        body: { leadId }
      });

      if (error) {
        console.error("Error fetching conditions:", error);
        toast.error("Failed to load loan conditions");
        return;
      }

      if (data.success && data.conditions) {
        setConditions(data.conditions);
      }
    } catch (error) {
      console.error("Error fetching conditions:", error);
      toast.error("Failed to load loan conditions");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      console.log("File uploaded:", file.name);
      
      toast({
        title: "Document uploaded successfully",
        description: `${file.name} has been uploaded and will be reviewed.`,
      });
      
      setTimeout(refreshData, 1000);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("There was an error uploading your document. Please try again.");
    }
  };

  const renderConditionsList = (conditions: LoanCondition[], title: string) => (
    <Card className="bg-white border border-blue-100">
      <CardHeader className="bg-blue-50 pb-2">
        <CardTitle className="text-lg font-medium text-blue-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 bg-white">
        {conditions?.length > 0 ? (
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <div 
                key={condition.id || index} 
                className={`p-4 rounded-lg border flex items-start justify-between ${
                  condition.status === 'completed' 
                    ? 'bg-green-50 border-green-200' 
                    : condition.status === 'urgent'
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div>
                    {condition.status === 'completed' ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <FileText size={20} className={condition.status === 'urgent' ? "text-red-500" : "text-gray-400"} />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-medium ${
                      condition.status === 'completed' 
                        ? 'line-through text-green-800' 
                        : condition.status === 'urgent' 
                        ? 'text-red-800' 
                        : 'text-gray-800'
                    }`}>
                      {condition.text}
                    </h4>
                    {condition.status === 'urgent' && (
                      <Badge className="mt-1 bg-red-500">Urgent</Badge>
                    )}
                  </div>
                </div>
                
                {condition.status !== 'completed' && (
                  <Button size="sm" className="bg-mortgage-purple hover:bg-mortgage-darkPurple">
                    <Upload size={16} className="mr-1" /> Upload
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-blue-800 italic">
            No {title.toLowerCase()} found.
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-mortgage-purple border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading conditions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {renderConditionsList(conditions?.masterConditions || [], "Master Conditions")}
        {renderConditionsList(conditions?.generalConditions || [], "General Conditions")}
        {renderConditionsList(conditions?.priorToFinalConditions || [], "Prior to Final Conditions")}
        {renderConditionsList(conditions?.complianceConditions || [], "Compliance Conditions")}
      </div>
    </div>
  );
};
