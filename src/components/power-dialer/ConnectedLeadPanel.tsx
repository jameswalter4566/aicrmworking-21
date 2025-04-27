
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConnectedLeadPanelProps {
  leadData: any | null;
  onRefresh?: () => void;
  isError?: boolean;
  errorMessage?: string;
}

export const ConnectedLeadPanel: React.FC<ConnectedLeadPanelProps> = ({ 
  leadData, 
  onRefresh,
  isError = false,
  errorMessage = ''
}) => {
  const isFallbackData = React.useMemo(() => {
    if (!leadData) return false;
    return leadData.id === 999999 || 
          (leadData.first_name === "FALLBACK" && 
           leadData.last_name === "DATA");
  }, [leadData]);

  if (!leadData) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Connected Lead</CardTitle>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCcw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isError || isFallbackData ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isError 
                ? errorMessage || 'An error occurred loading the lead data'
                : 'Could not retrieve complete lead details. Showing fallback data.'}
            </AlertDescription>
          </Alert>
        ) : null}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Name</h3>
            <p className="font-medium">{leadData.first_name} {leadData.last_name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Phone</h3>
            <p className="font-medium">{leadData.phone1}</p>
            {leadData.phone2 && leadData.phone2 !== '---' && (
              <p className="text-sm text-muted-foreground">{leadData.phone2}</p>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
            <p className="font-medium">{leadData.email}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Disposition</h3>
            <p className="font-medium">
              <Badge variant={isFallbackData ? "outline" : "default"}>
                {leadData.disposition}
              </Badge>
            </p>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Property Address</h3>
            <p className="font-medium">{leadData.property_address}</p>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Mailing Address</h3>
            <p className="font-medium">{leadData.mailing_address}</p>
          </div>
          
          {leadData.tags && leadData.tags.length > 0 && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {leadData.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {leadData.id && !isFallbackData && (
            <div className="md:col-span-2 mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Lead ID: {leadData.id}
                {leadData.created_at && (
                  <> • Created: {new Date(leadData.created_at).toLocaleDateString()}</>
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
