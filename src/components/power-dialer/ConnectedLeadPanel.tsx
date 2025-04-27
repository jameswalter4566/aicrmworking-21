import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface ConnectedLeadPanelProps {
  leadData?: {
    [key: string]: any;
  };
  onRefresh?: () => void;
}

export const ConnectedLeadPanel = ({ leadData, onRefresh }: ConnectedLeadPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [localLeadData, setLocalLeadData] = useState<any>(leadData);
  
  const displayData = localLeadData || leadData;
  
  useEffect(() => {
    console.log("[ConnectedLeadPanel] Raw lead data from props:", leadData);
    console.log("[ConnectedLeadPanel] Local lead data state:", localLeadData);
    
    // Log specific fields of interest
    if (leadData) {
      console.log("[ConnectedLeadPanel] Lead Details:", {
        name: `${leadData.first_name || ''} ${leadData.last_name || ''}`,
        phone1: leadData.phone1,
        email: leadData.email,
        property_address: leadData.property_address,
        mailing_address: leadData.mailing_address
      });
    }
  }, [leadData, localLeadData]);

  useEffect(() => {
    fetchLatestLead();
  }, []);

  useEffect(() => {
    if (leadData) {
      setLocalLeadData(leadData);
    }
  }, [leadData]);

  const fetchLatestLead = async () => {
    try {
      setIsLoading(true);
      
      const { data: response, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { 
          source: 'all',
          pageSize: 1,
          page: 0
        }
      });

      if (error) {
        console.error('ConnectedLeadPanel: Error fetching latest lead:', error);
        toast.error('Failed to fetch latest lead');
        return;
      }

      if (response?.data?.[0]) {
        console.log('ConnectedLeadPanel: Latest lead data fetched:', response.data[0]);
        
        // Convert API response format to match our expected format
        const formattedLeadData = {
          id: response.data[0].id,
          first_name: response.data[0].firstName || '',
          last_name: response.data[0].lastName || '',
          email: response.data[0].email || '',
          phone1: response.data[0].phone1 || '',
          phone2: response.data[0].phone2 || '',
          property_address: response.data[0].propertyAddress || '',
          mailing_address: response.data[0].mailingAddress || '',
          disposition: response.data[0].disposition || 'Not Contacted',
          tags: response.data[0].tags || [],
          created_at: response.data[0].createdAt,
          updated_at: response.data[0].updatedAt
        };
        
        setLocalLeadData(formattedLeadData);
        toast.success('Latest lead loaded');
      }
    } catch (err) {
      console.error('ConnectedLeadPanel: Error in fetchLatestLead:', err);
      toast.error('Failed to retrieve latest lead');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchLatestLead();
    }
  };

  if ((!displayData || Object.keys(displayData).length === 0) && isLoading) {
    return (
      <Card className="mt-4 relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            Lead Details
            <Button 
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Retrieve Latest Lead'
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Name</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Address Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Property Address</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Mailing Address</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayData || Object.keys(displayData).length === 0) {
    return (
      <Card className="mt-4 relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            Lead Details - No Lead Data Available
            <Button 
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Retrieve Latest Lead'
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-muted-foreground">
            <p>No lead data available. Try retrieving the latest lead.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-2 border-green-500 relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          {displayData?.id ? 
            `Lead Details - ID: ${displayData.id}` : 
            'Lead Details - No Lead ID Available'}
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Retrieve Latest Lead'
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <div className="text-sm mt-1 font-medium">
                  {`${displayData?.first_name || ''} ${displayData?.last_name || ''}`}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Primary Phone</label>
                <div className="text-sm mt-1 font-medium">
                  {displayData?.phone1 || "---"}
                </div>
              </div>

              {displayData?.phone2 && (
                <div>
                  <label className="text-sm text-gray-500">Secondary Phone</label>
                  <div className="text-sm mt-1 font-medium">
                    {displayData?.phone2}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <div className="text-sm mt-1 font-medium">
                  {displayData?.email || "---"}
                </div>
              </div>

              {displayData?.disposition && (
                <div>
                  <label className="text-sm text-gray-500">Disposition</label>
                  <div className="text-sm mt-1 font-medium">
                    {displayData?.disposition}
                  </div>
                </div>
              )}

              {displayData?.tags && displayData.tags.length > 0 && (
                <div>
                  <label className="text-sm text-gray-500">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {displayData.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Address Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Property Address</label>
                <div className="text-sm mt-1 font-medium">
                  {displayData?.property_address || "---"}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Mailing Address</label>
                <div className="text-sm mt-1 font-medium">
                  {displayData?.mailing_address || "---"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded">
            <details>
              <summary className="cursor-pointer text-sm text-gray-600">Raw Lead Data</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(displayData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
