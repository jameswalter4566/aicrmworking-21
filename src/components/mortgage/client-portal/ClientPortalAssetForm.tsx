
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Asset {
  id: string;
  type: string;
  institution: string;
  accountNumber: string;
  value: string;
}

interface ClientPortalAssetFormProps {
  isEditable?: boolean;
}

const assetTypes = [
  "Checking Account",
  "Savings Account",
  "Money Market Account",
  "Certificate of Deposit",
  "Mutual Fund",
  "Stocks",
  "Bonds",
  "Retirement Account",
  "Cash Value of Life Insurance",
  "Other Liquid Asset"
];

export default function ClientPortalAssetForm({ isEditable = false }: ClientPortalAssetFormProps) {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  useEffect(() => {
    if (!slug || !token) return;
    
    const fetchAssetData = async () => {
      try {
        setLoading(true);
        // Get lead ID from portal access
        const { data: portalData, error: portalError } = await supabase
          .from('client_portal_access')
          .select('lead_id')
          .eq('portal_slug', slug)
          .eq('access_token', token)
          .single();
        
        if (portalError || !portalData?.lead_id) {
          console.error("Error fetching portal access:", portalError);
          return;
        }
        
        setLeadId(portalData.lead_id.toString());
        
        // Get lead data
        const { data: response, error: profileError } = await supabase.functions.invoke('lead-profile', {
          body: { id: portalData.lead_id }
        });

        if (profileError || !response.success || !response.data.lead) {
          console.error("Error fetching lead data:", profileError || response.error);
          return;
        }
        
        const lead = response.data.lead;
        const mortgageData = lead.mortgageData || {};
        const assetData = mortgageData.assets?.accounts || [];
        
        if (Array.isArray(assetData) && assetData.length > 0) {
          const formattedAssets = assetData.map((asset: any, index: number) => ({
            id: `asset-${index}`,
            type: asset.type || "",
            institution: asset.institution || "",
            accountNumber: asset.accountNumber || "",
            value: asset.value?.toString() || ""
          }));
          setAssets(formattedAssets);
        } else {
          // Add a default empty asset if none exist
          setAssets([{ 
            id: `asset-0`, 
            type: "", 
            institution: "", 
            accountNumber: "", 
            value: "" 
          }]);
        }
      } catch (error) {
        console.error("Error in fetchAssetData:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssetData();
  }, [slug, token]);

  const handleAddAsset = () => {
    const newId = `asset-${assets.length}`;
    setAssets([...assets, { id: newId, type: "", institution: "", accountNumber: "", value: "" }]);
  };

  const handleRemoveAsset = (id: string) => {
    if (assets.length <= 1) return; // Keep at least one asset form
    setAssets(assets.filter(asset => asset.id !== id));
  };

  const handleAssetChange = (id: string, field: keyof Asset, value: string) => {
    setAssets(assets.map(asset => 
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  };
  
  const handleSave = async () => {
    if (!leadId) {
      toast.error("Cannot save: Lead ID is missing");
      return;
    }
    
    try {
      setSaving(true);
      
      // Format assets for saving
      const formattedAssets = assets.filter(asset => 
        asset.type || asset.institution || asset.accountNumber || asset.value
      ).map(asset => ({
        type: asset.type,
        institution: asset.institution,
        accountNumber: asset.accountNumber,
        value: asset.value
      }));
      
      const mortgageData = {
        assets: {
          accounts: formattedAssets
        }
      };
      
      const { data, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: leadId,
          leadData: { mortgageData }
        }
      });
      
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Failed to update asset information");
      }
      
      toast.success("Asset information saved successfully");
    } catch (error) {
      console.error("Error saving asset information:", error);
      toast.error("Failed to save asset information");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-mortgage-darkPurple">Assets</CardTitle>
        <CardDescription>Provide information about your liquid assets and accounts</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {assets.map((asset) => (
          <div key={asset.id} className="p-4 border rounded-md bg-gray-50/80">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-700">Asset Information</h3>
              {assets.length > 1 && isEditable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveAsset(asset.id)}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor={`type-${asset.id}`}>Asset Type</Label>
                <Select
                  disabled={!isEditable}
                  value={asset.type}
                  onValueChange={(value) => handleAssetChange(asset.id, "type", value)}
                >
                  <SelectTrigger id={`type-${asset.id}`} className="w-full">
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor={`institution-${asset.id}`}>Financial Institution</Label>
                <Input
                  id={`institution-${asset.id}`}
                  placeholder="Bank or institution name"
                  value={asset.institution}
                  onChange={(e) => handleAssetChange(asset.id, "institution", e.target.value)}
                  disabled={!isEditable}
                />
              </div>
              
              <div>
                <Label htmlFor={`account-${asset.id}`}>Account Number (last 4 digits)</Label>
                <Input
                  id={`account-${asset.id}`}
                  placeholder="xxxx"
                  value={asset.accountNumber}
                  onChange={(e) => handleAssetChange(asset.id, "accountNumber", e.target.value)}
                  disabled={!isEditable}
                  maxLength={4}
                />
              </div>
              
              <div>
                <Label htmlFor={`value-${asset.id}`}>Current Value</Label>
                <Input
                  id={`value-${asset.id}`}
                  placeholder="$ Amount"
                  value={asset.value}
                  onChange={(e) => {
                    // Allow only numbers and decimal point
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    handleAssetChange(asset.id, "value", value);
                  }}
                  type="text"
                  inputMode="decimal"
                  disabled={!isEditable}
                  prefix="$"
                />
              </div>
            </div>
          </div>
        ))}

        {isEditable && (
          <Button 
            variant="outline" 
            className="w-full border-dashed border-gray-300 hover:border-gray-400"
            onClick={handleAddAsset}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Asset
          </Button>
        )}

        <div className="flex justify-between items-center mt-6">
          <div className="text-lg font-medium">
            Total Assets: ${assets.reduce((sum, asset) => sum + (parseFloat(asset.value) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          
          {isEditable && (
            <Button 
              onClick={handleSave} 
              className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Assets'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
