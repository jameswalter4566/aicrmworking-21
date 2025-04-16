
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, FileCheck, FileWarning, CalendarClock } from "lucide-react";
import { toast } from "sonner";

interface AttentionItem {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'urgent' | 'disclosure' | 'deadline';
  dueDate?: string;
  action?: {
    label: string;
    url?: string;
    onClick?: () => void;
  };
}

const ClientAttention = () => {
  const [attentionItems, setAttentionItems] = React.useState<AttentionItem[]>([
    {
      id: "a1",
      title: "Loan Disclosures Require Signature",
      description: "Your initial loan disclosures have been sent and require your signature to proceed with the loan.",
      type: 'disclosure',
      dueDate: "04/20/2025",
      action: {
        label: "Sign Documents",
        onClick: () => {
          toast.success("Redirecting to document signing portal...");
        }
      }
    },
    {
      id: "a2",
      title: "Income Documentation Incomplete",
      description: "We need your most recent pay stub to verify your income. This is required for final loan approval.",
      type: 'warning',
      action: {
        label: "Upload Documents",
        onClick: () => {
          window.location.href = "/client-dashboard/conditions";
        }
      }
    },
    {
      id: "a3",
      title: "Homeowners Insurance Required",
      description: "Please provide proof of homeowners insurance before your closing date.",
      type: 'deadline',
      dueDate: "04/25/2025",
      action: {
        label: "Upload Insurance",
        onClick: () => {
          window.location.href = "/client-dashboard/conditions";
        }
      }
    },
    {
      id: "a4",
      title: "Closing Disclosure Available",
      description: "Your Closing Disclosure is ready for review. Please review and acknowledge receipt.",
      type: 'urgent',
      dueDate: "04/18/2025",
      action: {
        label: "Review Disclosure",
        onClick: () => {
          toast.success("Opening closing disclosure...");
        }
      }
    }
  ]);

  const handleDismiss = (itemId: string) => {
    setAttentionItems(items => items.filter(item => item.id !== itemId));
    toast.success("Item acknowledged");
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'urgent':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'disclosure':
        return <FileCheck className="h-6 w-6 text-blue-500" />;
      case 'deadline':
        return <CalendarClock className="h-6 w-6 text-purple-500" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Action Needed</Badge>;
      case 'urgent':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Urgent</Badge>;
      case 'disclosure':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Disclosure</Badge>;
      case 'deadline':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Deadline</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-800">Attention Needed</h1>
      </div>
      
      {attentionItems.length > 0 ? (
        <div className="space-y-4">
          {attentionItems.map((item) => (
            <Card key={item.id} className={`border-l-4 ${
              item.type === 'urgent' ? 'border-l-red-500' :
              item.type === 'warning' ? 'border-l-amber-500' :
              item.type === 'disclosure' ? 'border-l-blue-500' :
              'border-l-purple-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1 mr-4">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      {getTypeBadge(item.type)}
                    </div>
                    <p className="text-gray-600 mb-3">{item.description}</p>
                    
                    {item.dueDate && (
                      <div className="flex items-center mb-3 text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Due by: {item.dueDate}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      {item.action && (
                        <Button 
                          onClick={item.action.onClick} 
                          className={`
                            ${item.type === 'urgent' ? 'bg-red-600 hover:bg-red-700' :
                             item.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                             item.type === 'disclosure' ? 'bg-blue-600 hover:bg-blue-700' :
                             'bg-purple-600 hover:bg-purple-700'}
                          `}
                        >
                          {item.action.label}
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        onClick={() => handleDismiss(item.id)}
                      >
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <FileCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h2>
            <p className="text-gray-600">
              You don't have any items that require your attention right now.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientAttention;
