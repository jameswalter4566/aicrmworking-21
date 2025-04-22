
import React, { useState, useEffect } from 'react';
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

  // Update local state when initialValue prop changes (e.g., after fetch)
  useEffect(() => {
    if (initialValue) {
      setPhoneNumber(initialValue);
      setLastSavedNumber(initialValue);
    }
  }, [initialValue]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Return empty string if no digits
    if (!digits) return '';
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    // Partial formatting
    if (digits.length > 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length > 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    if (digits.length > 0) {
      return `(${digits}`;
    }
    
    return '';
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
      setLastSavedNumber(phoneNumber);
      toast.success('Phone number updated successfully');
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
          placeholder={(lastSavedNumber || "(555) 555-5555")}
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
