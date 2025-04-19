
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CompanySettings {
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export const CompanySettingsCard = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: '',
    primary_color: '#33C3F0',
    secondary_color: '#8B5CF6',
    accent_color: '#EA384C',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanySettings();
  }, [user]);

  const fetchCompanySettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from('company_settings')
          .update(settings)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('company_settings')
          .insert([{ ...settings, user_id: user.id }]);

        if (error) throw error;
      }

      toast.success('Company settings saved successfully');
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Failed to save company settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Building className="h-6 w-6 text-gray-500" />
          <div>
            <CardTitle>Company Settings</CardTitle>
            <CardDescription>
              Customize your company details and branding colors
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={settings.company_name}
              onChange={(e) =>
                setSettings({ ...settings, company_name: e.target.value })
              }
              placeholder="Enter your company name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex space-x-2">
                <div className="relative w-16 h-10 rounded-md overflow-hidden bg-white">
                  <Input
                    id="primary_color"
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) =>
                      setSettings({ ...settings, primary_color: e.target.value })
                    }
                    className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer rounded-md"
                  />
                </div>
                <Input
                  value={settings.primary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, primary_color: e.target.value })
                  }
                  placeholder="#33C3F0"
                  className="rounded-md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex space-x-2">
                <div className="relative w-16 h-10 rounded-md overflow-hidden bg-white">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) =>
                      setSettings({ ...settings, secondary_color: e.target.value })
                    }
                    className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer rounded-md"
                  />
                </div>
                <Input
                  value={settings.secondary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, secondary_color: e.target.value })
                  }
                  placeholder="#8B5CF6"
                  className="rounded-md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex space-x-2">
                <div className="relative w-16 h-10 rounded-md overflow-hidden bg-white">
                  <Input
                    id="accent_color"
                    type="color"
                    value={settings.accent_color}
                    onChange={(e) =>
                      setSettings({ ...settings, accent_color: e.target.value })
                    }
                    className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer rounded-md"
                  />
                </div>
                <Input
                  value={settings.accent_color}
                  onChange={(e) =>
                    setSettings({ ...settings, accent_color: e.target.value })
                  }
                  placeholder="#EA384C"
                  className="rounded-md"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
