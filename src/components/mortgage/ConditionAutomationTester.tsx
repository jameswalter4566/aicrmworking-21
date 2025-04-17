
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  leadId: string;
  conditions: any;
}

const ConditionAutomationTester: React.FC<Props> = ({ leadId, conditions }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runAutomation = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('automation-matcher', {
        body: { 
          leadId,
          conditions
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      setResults(data.automationResults);
      toast.success("Automation completed successfully");

    } catch (error: any) {
      console.error("Error running automation:", error);
      toast.error(error.message || "Failed to run automation");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">Condition Automation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!results ? (
            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <AlertTitle className="text-blue-800">Test Automation</AlertTitle>
              <AlertDescription className="text-blue-700">
                Click the button below to test the condition automation system. This will analyze all conditions
                and route them to the appropriate automation handlers.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="json">Raw JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4 pt-4">
                <div className="flex flex-wrap gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 flex-1">
                    <div className="text-green-800 font-semibold">Automated</div>
                    <div className="text-3xl font-bold text-green-700">
                      {results.automatedConditionIds.length}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex-1">
                    <div className="text-yellow-800 font-semibold">Manual</div>
                    <div className="text-3xl font-bold text-yellow-700">
                      {results.manualConditionIds.length}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex-1">
                    <div className="text-blue-800 font-semibold">Pending</div>
                    <div className="text-3xl font-bold text-blue-700">
                      {results.pendingConditionIds.length}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Automation Results</h3>
                  <div className="space-y-2">
                    {Object.entries(results.automationSummary).map(([automationType, data]: [string, any]) => (
                      <div key={automationType} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-2">
                          {data.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          <span className="font-medium">{automationType}</span>
                          <Badge variant="outline">{data.conditionIds.length} conditions</Badge>
                        </div>
                        <Badge className={data.success ? "bg-green-500" : "bg-yellow-500"}>
                          {data.success ? "Success" : "Manual Review"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Automation Details</h3>
                  <div className="space-y-3">
                    {Object.entries(results.automationSummary).map(([automationType, data]: [string, any]) => (
                      <div key={automationType} className="border rounded-md overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                          <span className="font-semibold">{automationType}</span>
                          <Badge className={data.success ? "bg-green-500" : "bg-yellow-500"}>
                            {data.success ? "Success" : "Manual Review"}
                          </Badge>
                        </div>
                        <div className="p-4">
                          <div className="text-sm">
                            <strong>Conditions:</strong> {data.conditionIds.length}
                          </div>
                          {data.details && (
                            <div className="mt-2 text-sm bg-gray-50 p-3 rounded">
                              <strong>Details:</strong>
                              <pre className="mt-1 whitespace-pre-wrap text-xs">
                                {JSON.stringify(data.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="json" className="pt-4">
                <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                  <pre className="text-xs">{JSON.stringify(results, null, 2)}</pre>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={runAutomation} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : results ? (
            "Run Automation Again"
          ) : (
            "Run Condition Automation"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ConditionAutomationTester;
