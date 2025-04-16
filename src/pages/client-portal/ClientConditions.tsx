
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUp, ChevronDown, CheckCircle, Clock, AlertCircle, Info } from "lucide-react";

interface Condition {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  notes: string;
  category: 'income' | 'assets' | 'property' | 'other';
}

const ClientConditions = () => {
  const [conditions, setConditions] = useState<Condition[]>([
    {
      id: "c1",
      title: "Most recent 30 days of pay stubs",
      description: "Please provide your most recent 30 days of pay stubs from your current employer.",
      status: 'pending',
      notes: "Required for income verification. Please ensure all pages are included.",
      category: 'income'
    },
    {
      id: "c2",
      title: "Last 2 years of W-2 statements",
      description: "Please provide your W-2 statements for the last 2 tax years.",
      status: 'submitted',
      notes: "Under review by the underwriter. Submitted on 04/12/2025.",
      category: 'income'
    },
    {
      id: "c3",
      title: "Last 2 months of bank statements",
      description: "Please provide your most recent 2 months of bank statements for all accounts.",
      status: 'approved',
      notes: "Approved on 04/10/2025. No further action needed.",
      category: 'assets'
    },
    {
      id: "c4",
      title: "Home insurance quote",
      description: "Please provide a home insurance quote for the property being financed.",
      status: 'rejected',
      notes: "Rejected on 04/11/2025. The coverage amount is insufficient. Please provide a new quote with at least $400,000 in coverage.",
      category: 'property'
    },
    {
      id: "c5",
      title: "Letter of explanation for credit inquiry",
      description: "Please provide a letter explaining the recent credit inquiry from Capital One on 03/15/2025.",
      status: 'pending',
      notes: "Required by the underwriter to proceed with your loan approval.",
      category: 'other'
    }
  ]);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, conditionId: string) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      // Here you would normally upload the file to your server
      // For demo purposes, we'll simulate the upload
      setUploadingForId(conditionId);
      
      setTimeout(() => {
        // Update the condition status to submitted
        setConditions(conditions.map(condition => 
          condition.id === conditionId 
            ? { 
                ...condition, 
                status: 'submitted', 
                notes: `Submitted on ${new Date().toLocaleDateString()}. Under review.`
              } 
            : condition
        ));
        setUploadingForId(null);
        setSelectedFile(null);
        toast.success("Document uploaded successfully!");
      }, 2000);
    }
  };

  const getCompletionRate = () => {
    const completed = conditions.filter(c => c.status === 'approved').length;
    return Math.round((completed / conditions.length) * 100);
  };
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'submitted':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Submitted</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Needs Attention</Badge>;
      default:
        return null;
    }
  };
  
  // Group conditions by category
  const groupedConditions = conditions.reduce((acc, condition) => {
    if (!acc[condition.category]) {
      acc[condition.category] = [];
    }
    acc[condition.category].push(condition);
    return acc;
  }, {} as Record<string, Condition[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-800">Outstanding Conditions</h1>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">
            {getCompletionRate()}% Complete
          </span>
          <div className="w-32">
            <Progress value={getCompletionRate()} className="h-2" />
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-blue-700">
            Upload Your Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Please upload the required documents to satisfy the loan conditions. Your loan processor will review them as soon as possible.
          </p>
          
          <div className="space-y-6">
            {Object.entries(groupedConditions).map(([category, categoryConditions]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-medium text-blue-800 capitalize">{category} Documentation</h3>
                
                {categoryConditions.map((condition) => (
                  <Collapsible key={condition.id} className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left bg-white hover:bg-gray-50 border-b">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(condition.status)}
                        <div>
                          <h4 className="font-medium">{condition.title}</h4>
                          <div className="mt-1">
                            {getStatusBadge(condition.status)}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5" />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="p-4 bg-gray-50">
                      <p className="text-gray-600 mb-4">{condition.description}</p>
                      
                      <div className="bg-white p-3 rounded border mb-4">
                        <h5 className="text-sm font-medium mb-1">Notes</h5>
                        <p className="text-sm text-gray-600">{condition.notes}</p>
                      </div>
                      
                      {condition.status !== 'approved' && (
                        <div className="flex items-center">
                          <label htmlFor={`file-upload-${condition.id}`}>
                            <Button 
                              variant="outline" 
                              className="cursor-pointer flex items-center bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                              disabled={uploadingForId === condition.id}
                            >
                              {uploadingForId === condition.id ? (
                                <>
                                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-700 border-t-transparent rounded-full" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <FileUp className="h-4 w-4 mr-2" />
                                  Upload Document
                                </>
                              )}
                            </Button>
                            <input
                              id={`file-upload-${condition.id}`}
                              type="file"
                              onChange={(e) => handleFileChange(e, condition.id)}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.png"
                              disabled={uploadingForId === condition.id}
                            />
                          </label>
                          
                          {selectedFile && uploadingForId === condition.id && (
                            <span className="ml-3 text-sm text-gray-600">
                              {selectedFile.name}
                            </span>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientConditions;
