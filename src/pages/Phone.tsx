
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { TwilioPhone } from '@/components/twilio/TwilioPhone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Phone } from 'lucide-react';

const PhonePage = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Phone className="h-6 w-6 text-gray-500" />
          <h1 className="text-2xl font-bold">Phone</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TwilioPhone className="md:col-span-1" />
          
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Phone Instructions</CardTitle>
              <CardDescription>
                How to use the Twilio phone interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Making Calls</h3>
                <p className="text-sm text-gray-600">
                  Enter a phone number and click "Call" to initiate a call. Include country code (e.g., +1 for US numbers).
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">During a Call</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Use the dial pad to send touch tones (e.g., for navigating phone menus)</li>
                  <li>Click "Mute" to temporarily disable your microphone</li>
                  <li>Click "End Call" to hang up</li>
                </ul>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  For best call quality, use headphones and make calls in a quiet environment.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default PhonePage;
