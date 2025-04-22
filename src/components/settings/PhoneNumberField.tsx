
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PhoneNumberFieldProps {
  initialValue: string;
  onUpdate: (phoneNumber: string) => Promise<void>;
}

export const PhoneNumberField = ({ initialValue, onUpdate }: PhoneNumberFieldProps) => {
  const [phoneNumber, setPhoneNumber] = useState(initialValue || '');
  const [saving, setSaving] = useState(false);
  const [lastSavedNumber, setLastSavedNumber] = useState(initialValue || '');

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX if it has enough digits
    if (digits.length >= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    // Return partially formatted number or the original input if less than 3 digits
    if (digits.length > 3 && digits.length < 7) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)})${digits.length > 3 ? ' ' + digits.slice(3) : ''}`;
    }
    
    return value;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    setPhoneNumber(formattedNumber);
  };

  const handleSave = async () => {
    if (!phoneNumber || phoneNumber === lastSavedNumber) {
      return;
    }
    
    setSaving(true);
    try {
      await onUpdate(phoneNumber);
      toast.success('Phone number updated successfully');
      setLastSavedNumber(phoneNumber);
    } catch (error) {
      console.error('Error updating phone number:', error);
      toast.error('Failed to update phone number');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
      <div className="flex space-x-2">
        <Input
          id="phone"
          type="tel"
          value={phoneNumber}
          onChange={handleChange}
          placeholder="(555) 555-5555"
          className="flex-1"
        />
        <Button 
          onClick={handleSave}
          disabled={saving || !phoneNumber || phoneNumber === lastSavedNumber}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Used for important updates about your account and pipeline
      </p>
    </div>
  );
};
