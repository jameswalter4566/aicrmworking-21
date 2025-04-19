
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import MainLayout from "@/components/layouts/MainLayout";
import ProcessorSidebar from "@/components/mortgage/ProcessorSidebar";
import { ConditionItem } from "@/components/mortgage/ConditionItem";
import EmailSearch from "@/components/mortgage/EmailSearch";

interface ConditionType {
  id: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  [key: string]: any;
}

interface ConditionsData {
  masterConditions?: ConditionType[];
  generalConditions?: ConditionType[];
  priorToFinalConditions?: ConditionType[];
  complianceConditions?: ConditionType[];
  [key: string]: ConditionType[] | undefined;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  loanId: string;
}

const ProcessorAssistViewer = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("conditions");
  const [loanApplication, setLoanApplication] = useState<Lead | null>(null);
  const [conditions, setConditions] = useState<ConditionsData>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLeadData(leadId);
    }
  }, [leadId]);

  const fetchLeadData = async (leadId: string) => {
    setIsLoading(true);
    try {
      // Mock API call - replace with actual Supabase function call
      const mockLeadData = {
        id: leadId,
        firstName: "John",
        lastName: "Doe",
        loanId: "ML-" + leadId,
      };

      setLoanApplication(mockLeadData);
    } catch (error) {
      console.error("Error fetching lead data:", error);
      toast.error("Failed to load lead data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConditionsFound = (newConditions: ConditionsData) => {
    setConditions(newConditions);
  };

  const handleConditionStatusChange = (
    conditionId: string,
    newStatus: "pending" | "approved" | "rejected",
    category: string
  ) => {
    setConditions((prevConditions) => {
      const updatedCategory = prevConditions[category]?.map((condition) =>
        condition.id === conditionId ? { ...condition, status: newStatus } : condition
      );

      return {
        ...prevConditions,
        [category]: updatedCategory,
      };
    });
  };

  const renderConditions = (category: string, title: string) => {
    const conditionList = conditions[category];

    if (!conditionList || conditionList.length === 0) {
      return (
        <Card className="shadow-none border-0">
          <CardContent className="text-center p-4">
            <AlertTriangle className="h-6 w-6 inline-block mr-2 text-yellow-500" />
            No {title.toLowerCase()} found.
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {conditionList.map((condition) => (
          <ConditionItem
            key={condition.id}
            condition={condition}
            onStatusChange={(newStatus) =>
              handleConditionStatusChange(condition.id, newStatus, category)
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/processor-assist")}>
          Back to Loan List
        </Button>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <ProcessorSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {activeTab === "conditions" && (
              <div className="space-y-6">
                <EmailSearch
                  clientLastName={loanApplication?.lastName || ""}
                  loanNumber={loanApplication?.loanId || ""}
                  leadId={leadId}
                  onConditionsFound={handleConditionsFound}
                />
                
                {conditions && (
                  <div className="mt-8 space-y-4">
                    {renderConditions("masterConditions", "Master Conditions")}
                    {renderConditions("generalConditions", "General Conditions")}
                    {renderConditions("priorToFinalConditions", "Prior To Final Conditions")}
                    {renderConditions("complianceConditions", "Compliance Conditions")}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "documents" && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Document Management</h2>
                <p className="text-gray-600">Manage and upload documents related to this loan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessorAssistViewer;
