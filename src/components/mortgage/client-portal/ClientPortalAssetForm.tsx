
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, CreditCard, MapPin, Plus } from "lucide-react";

interface AssetEntry {
  id: string;
  assetOwner: string;
  borrowerName: string;
  assetType: string;
  depositor: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  accountNumber: string;
  cashValue: number;
}

interface ClientPortalAssetFormProps {
  initialAssets?: AssetEntry[];
  isEditable?: boolean;
  onAssetsChange?: (assets: AssetEntry[]) => void;
}

// Default asset form entry
const defaultEntry: AssetEntry = {
  id: "",
  assetOwner: "borrower",
  borrowerName: "",
  assetType: "checkingAccount",
  depositor: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  accountNumber: "",
  cashValue: 0
};

const assetTypeLabels: Record<string, string> = {
  checkingAccount: "Checking Account",
  savingsAccount: "Savings Account",
  moneyMarket: "Money Market",
  cd: "Certificate of Deposit",
  stocks: "Stocks/Bonds/Mutual Funds",
  retirement: "Retirement Account",
  other: "Other Asset"
};

export const ClientPortalAssetForm: React.FC<ClientPortalAssetFormProps> = ({
  initialAssets = [],
  isEditable = true,
  onAssetsChange
}) => {
  const [showForm, setShowForm] = useState(false);
  const [assetEntries, setAssetEntries] = useState<AssetEntry[]>(initialAssets);
  const [currentEntry, setCurrentEntry] = useState<AssetEntry>({
    ...defaultEntry,
    id: Date.now().toString()
  });

  const handleAddNewAsset = () => {
    setShowForm(true);
    setCurrentEntry({ ...defaultEntry, id: Date.now().toString() });
  };

  const handleSaveAsset = () => {
    const updatedEntries = [...assetEntries, currentEntry];
    setAssetEntries(updatedEntries);
    setShowForm(false);
    setCurrentEntry({ ...defaultEntry, id: Date.now().toString() });

    // Notify parent if needed
    onAssetsChange?.(updatedEntries);
  };

  const handleCancelForm = () => {
    setShowForm(false);
  };

  const handleInputChange = (field: keyof AssetEntry, value: any) => {
    setCurrentEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Asset Information</h3>
        {!showForm && (
          <Button
            onClick={handleAddNewAsset}
            className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
            disabled={!isEditable}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        )}
      </div>

      {assetEntries.length === 0 && !showForm && (
        <div className="text-center py-8 border border-dashed rounded-md">
          <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No asset information has been added yet.</p>
          <Button
            variant="outline"
            onClick={handleAddNewAsset}
            className="mt-2"
            disabled={!isEditable}
          >
            Add Asset
          </Button>
        </div>
      )}

      {assetEntries.map((entry) => (
        <Card key={entry.id} className="bg-gray-50">
          <CardContent className="pt-4">
            <div className="font-medium mb-4 flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-mortgage-purple" />
              {assetTypeLabels[entry.assetType] || "Other Asset"}
            </div>
            <div className="text-sm">
              <p>
                <strong>Depositor:</strong> {entry.depositor}
              </p>
              <p>
                <strong>Account Number:</strong> {entry.accountNumber}
              </p>
              <p>
                <strong>Cash Value:</strong> ${entry.cashValue?.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      {showForm && (
        <div className="border rounded-lg p-4 bg-white">
          <h4 className="text-lg font-medium mb-4 border-b pb-2">Add Asset Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="assetOwner">Asset Owner</Label>
              <Select
                value={currentEntry.assetOwner}
                onValueChange={value => handleInputChange("assetOwner", value)}
                disabled={!isEditable}
              >
                <SelectTrigger id="assetOwner">
                  <SelectValue placeholder="Select Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrower">Borrower</SelectItem>
                  <SelectItem value="coBorrower">Co-Borrower</SelectItem>
                  <SelectItem value="joint">Joint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label htmlFor="borrowerName">Borrower Name</Label>
              <Input
                id="borrowerName"
                value={currentEntry.borrowerName}
                onChange={e => handleInputChange("borrowerName", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="assetType">Asset Type</Label>
              <Select
                value={currentEntry.assetType}
                onValueChange={value => handleInputChange("assetType", value)}
                disabled={!isEditable}
              >
                <SelectTrigger id="assetType">
                  <SelectValue placeholder="Select Asset Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkingAccount">Checking Account</SelectItem>
                  <SelectItem value="savingsAccount">Savings Account</SelectItem>
                  <SelectItem value="moneyMarket">Money Market</SelectItem>
                  <SelectItem value="cd">Certificate of Deposit</SelectItem>
                  <SelectItem value="stocks">Stocks/Bonds/Mutual Funds</SelectItem>
                  <SelectItem value="retirement">Retirement Account</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label htmlFor="depositor">Depositor/Financial Institution</Label>
              <Input
                id="depositor"
                value={currentEntry.depositor}
                onChange={e => handleInputChange("depositor", e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="addressLine1">
                <MapPin className="inline h-4 w-4 mr-1 opacity-70" />
                Address Line 1
              </Label>
              <Input
                id="addressLine1"
                value={currentEntry.addressLine1}
                onChange={e => handleInputChange("addressLine1", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={currentEntry.addressLine2}
                onChange={e => handleInputChange("addressLine2", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={currentEntry.city}
                onChange={e => handleInputChange("city", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={currentEntry.state}
                onChange={e => handleInputChange("state", e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={currentEntry.zipCode}
                onChange={e => handleInputChange("zipCode", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="accountNumber">
                <CreditCard className="inline h-4 w-4 mr-1 opacity-70" />
                Account Number
              </Label>
              <Input
                id="accountNumber"
                value={currentEntry.accountNumber}
                onChange={e => handleInputChange("accountNumber", e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="cashValue">
                <DollarSign className="inline h-4 w-4 mr-1 opacity-70" />
                Cash / Fair Market Value
              </Label>
              <Input
                id="cashValue"
                type="number"
                value={currentEntry.cashValue.toString()}
                onChange={e =>
                  handleInputChange("cashValue", parseFloat(e.target.value) || 0)
                }
                disabled={!isEditable}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelForm} disabled={!isEditable}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsset}
              disabled={!isEditable || !currentEntry.depositor}
              className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
            >
              Save Asset Information
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortalAssetForm;
