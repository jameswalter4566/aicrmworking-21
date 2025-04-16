import React, { useState, useEffect } from "react";
import { 
  Link2, 
  Mail, 
  MessageSquare, 
  Copy, 
  Check, 
  Clock, 
  Upload, 
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ClientPortalGenerator from "@/components/mortgage/ClientPortalGenerator";

interface Condition {
  id: string;
  name: string;
  status: 'pending' | 'received' | 'complete' | 'waived';
  notes: string;
  due_date?: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  type: string;
  description: string;
}

interface AILoanOfficerAssistProps {
  leadId: string;
}

const AILoanOfficerAssist = ({ leadId }: AILoanOfficerAssistProps) => {
  const [borrowerInfo, setBorrowerInfo] = useState<any>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBorrowerInfo();
    fetchConditions();
    fetchActivityLogs();
  }, [leadId]);

  const fetchBorrowerInfo = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { 
          leadId: leadId,
          exactMatch: true
        }
      });

      if (error) {
        console.error("Error fetching borrower info:", error);
        return;
      }

      if (data.data && data.data.length > 0) {
        setBorrowerInfo(data.data[0]);
      }
    } catch (error) {
      console.error("Error in fetchBorrowerInfo:", error);
    }
  };

  const fetchConditions = async () => {
    try {
      const response = await supabase.functions.invoke('retrieve-conditions', {
        body: { leadId }
      });

      if (response.data && response.data.conditions) {
        const allConditions: Condition[] = [];
        
        // Extract conditions from different categories
        const conditionsData = response.data.conditions;
        
        // Process master conditions
        if (conditionsData.masterConditions) {
          conditionsData.masterConditions.forEach((condition: any) => {
            allConditions.push({
              id: condition.id || `master-${Math.random().toString(36)}`,
              name: condition.name || condition.description || "Untitled Condition",
              status: condition.status || 'pending',
              notes: condition.notes || "",
              due_date: condition.dueDate
            });
          });
        }

        // Process other condition categories
        ['generalConditions', 'priorToFinalConditions', 'complianceConditions'].forEach(category => {
          if (conditionsData[category]) {
            conditionsData[category].forEach((condition: any) => {
              allConditions.push({
                id: condition.id || `${category}-${Math.random().toString(36)}`,
                name: condition.name || condition.description || "Untitled Condition",
                status: condition.status || 'pending',
                notes: condition.notes || "",
                due_date: condition.dueDate
              });
            });
          }
        });

        setConditions(allConditions);
      }
    } catch (error) {
      console.error("Error fetching conditions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    // In a real implementation, this would fetch from the database
    // For now, we'll create some sample activity logs
    const sampleLogs: ActivityLog[] = [
      {
        id: "1",
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        type: "message",
        description: "Client sent message requesting flood insurance information"
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        type: "upload",
        description: "Client uploaded W-2 documents to their portal"
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        type: "disclosure",
        description: "Client's initial disclosure has been sent successfully"
      },
      {
        id: "4",
        timestamp: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        type: "system",
        description: "Application moved to processing stage"
      }
    ];

    setActivityLogs(sampleLogs);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return "bg-yellow-100 text-yellow-800";
      case 'received': return "bg-blue-100 text-blue-800";
      case 'complete': return "bg-green-100 text-green-800";
      case 'waived': return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'upload': return <Upload className="h-5 w-5 text-green-600" />;
      case 'disclosure': return <FileText className="h-5 w-5 text-purple-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Client Portal Generator Section */}
      <Card className="bg-white border border-blue-100">
        <CardHeader className="bg-blue-50 pb-2">
          <CardTitle className="text-lg font-medium text-blue-900">
            Client Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="p-4 border border-blue-100 rounded-md bg-blue-50">
            <p className="text-sm mb-4 text-blue-700">
              Generate a secure portal link for this client to access their loan information and submit documents.
            </p>
            <ClientPortalGenerator leadId={parseInt(leadId)} />
          </div>
        </CardContent>
      </Card>

      {/* Borrower Portal Section */}
      <Card className="bg-white border border-blue-100">
        <CardHeader className="bg-blue-50 pb-2">
          <CardTitle className="text-lg font-medium text-blue-900">
            Borrower Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="p-4 border border-blue-100 rounded-md bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-900">Personalized Portal Link</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-blue-600"
                onClick={copyPortalLink}
              >
                <Copy className="h-4 w-4 mr-1" />
                <span>Copy</span>
              </Button>
            </div>
            <div className="flex items-center text-sm text-blue-800 bg-white p-2 rounded border border-blue-200 overflow-x-auto">
              <Link2 className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{portalLink}</span>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS to Borrower
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email to Borrower
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requested Conditions Section */}
      <Card className="bg-white border border-blue-100">
        <CardHeader className="bg-blue-50 pb-2">
          <CardTitle className="text-lg font-medium text-blue-900 flex items-center justify-between">
            <span>Requested Conditions</span>
            <Badge 
              variant="outline"  
              className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200"
            >
              {conditions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="text-center py-4">
              <span className="text-sm text-blue-800">Loading conditions...</span>
            </div>
          ) : conditions.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {conditions.map((condition) => (
                <AccordionItem 
                  key={condition.id} 
                  value={condition.id}
                  className="border border-blue-100 rounded-md mb-2 overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-2 hover:bg-blue-50 hover:no-underline">
                    <div className="flex items-center text-left">
                      <div className="mr-3">
                        {condition.status === 'complete' ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-blue-900">{condition.name}</span>
                        <div className="flex items-center mt-1">
                          <Badge className={getStatusColor(condition.status)}>
                            {condition.status.charAt(0).toUpperCase() + condition.status.slice(1)}
                          </Badge>
                          {condition.due_date && (
                            <span className="ml-2 text-xs text-gray-600">
                              Due: {formatDate(condition.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 pt-0 bg-blue-50 border-t border-blue-100">
                    <div className="mt-2 text-sm text-blue-900">
                      {condition.notes || "No additional notes."}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-4">
              <span className="text-sm text-blue-800">No conditions found.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log Section */}
      <Card className="bg-white border border-blue-100">
        <CardHeader className="bg-blue-50 pb-2">
          <CardTitle className="text-lg font-medium text-blue-900">
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {activityLogs.length > 0 ? (
              activityLogs.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start p-3 border border-blue-100 rounded-md hover:bg-blue-50"
                >
                  <div className="mr-3 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-900">{activity.description}</p>
                    <span className="text-xs text-gray-500">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <span className="text-sm text-blue-800">No activity logs found.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AILoanOfficerAssist;
