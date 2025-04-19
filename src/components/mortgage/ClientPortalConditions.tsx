
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConditionItem } from "./ConditionItem";

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

  const fetchConditions = async () => {
    if (!leadId) {
      console.error("No leadId provided to ClientPortalConditions");
      return;
    }

    console.log("Fetching conditions for leadId:", leadId);
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-conditions', {
        body: { leadId }
      });

      if (error) {
        console.error("Error fetching conditions:", error);
        toast.error("Failed to load loan conditions");
        return;
      }

      if (data?.success && data?.conditions) {
        console.log("Successfully retrieved conditions:", data.conditions);
        setConditions(data.conditions);
      } else {
        console.log("No conditions found or invalid response format:", data);
      }
    } catch (error) {
      console.error("Exception fetching conditions:", error);
      toast.error("Failed to load loan conditions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConditions();
  }, [leadId]);

  const handleFileUpload = async (file: File) => {
    try {
      console.log("File uploaded:", file.name);
      
      toast.success("Document uploaded successfully", {
        description: `${file.name} has been uploaded and will be reviewed.`
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
              <ConditionItem 
                key={condition.id || index}
                condition={condition}
                leadId={String(leadId)} // Convert leadId to string
              />
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
