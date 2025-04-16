
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare } from "lucide-react";

interface ConversationSectionProps {
  leadId: string;
}

const ConversationSection = ({ leadId }: ConversationSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-orange-800 mb-4">
        Client Conversations
      </h2>
      
      <Tabs defaultValue="email" className="w-full">
        <TabsList className="bg-orange-100 mb-4">
          <TabsTrigger 
            value="email" 
            className="data-[state=active]:bg-orange-200 data-[state=active]:text-orange-900"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger 
            value="sms" 
            className="data-[state=active]:bg-orange-200 data-[state=active]:text-orange-900"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="email">
          <Card className="bg-orange-50">
            <CardHeader className="bg-orange-100 pb-2">
              <CardTitle className="text-lg font-medium text-orange-900">Email Communication</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm text-orange-800 italic py-8 text-center">
                No email conversations found for this borrower yet.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sms">
          <Card className="bg-orange-50">
            <CardHeader className="bg-orange-100 pb-2">
              <CardTitle className="text-lg font-medium text-orange-900">SMS Communication</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-sm text-orange-800 italic py-8 text-center">
                No SMS conversations found for this borrower yet.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConversationSection;
