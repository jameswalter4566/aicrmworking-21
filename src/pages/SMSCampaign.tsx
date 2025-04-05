
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Tag, Calendar, Clock, UserPlus, Download, Mail } from "lucide-react";
import SMSSidebar from "@/components/sms/SMSSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { thoughtlyService } from "@/services/thoughtly";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SMSCampaign = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [selectedAudience, setSelectedAudience] = useState("all");
  const [frequency, setFrequency] = useState("one-time");
  const [timing, setTiming] = useState("immediate");
  const [isImporting, setIsImporting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const form = useForm();

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleCampaignNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCampaignName(e.target.value);
  };

  const importContacts = async () => {
    setIsImporting(true);
    try {
      const retrievedContacts = await thoughtlyService.getContacts();
      setContacts(retrievedContacts);
      
      toast({
        title: "Contacts imported successfully",
        description: `Imported ${retrievedContacts.length} contacts for your campaign.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error importing contacts:", error);
      
      toast({
        title: "Import failed",
        description: "Failed to import contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message) {
      toast({
        title: "Message required",
        description: "Please enter a message before sending.",
        variant: "destructive",
      });
      return;
    }

    if (contacts.length === 0) {
      toast({
        title: "No contacts",
        description: "Please import contacts before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-csv-email', {
        body: JSON.stringify({
          contacts: contacts,
          message: message,
          campaignName: campaignName
        })
      });

      if (error) {
        throw new Error(`Error sending campaign: ${error.message}`);
      }

      toast({
        title: "Campaign sent successfully",
        description: "Your SMS campaign has been sent via email.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Send failed",
        description: "Failed to send SMS campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen overflow-hidden w-full">
        <SMSSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            <div className="mb-4 flex items-center">
              <Button 
                variant="outline" 
                className="rounded-full mr-4"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">SMS Campaign</h1>
            </div>

            <div className="mb-6">
              <Card className="p-5 bg-gray-50 min-h-[200px] flex flex-col">
                <h2 className="text-lg font-semibold mb-2">Message Preview</h2>
                <div className="flex-1 flex items-start">
                  <div className="max-w-xs p-3 bg-blue-500 text-white rounded-lg shadow-md">
                    {message ? message : <span className="text-blue-200 italic">Your message will appear here...</span>}
                  </div>
                </div>
              </Card>
            </div>

            <Card className="mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">New Campaign 👋</h2>
                
                <div className="mb-5 p-4 bg-blue-50 rounded-lg text-blue-700">
                  <p>Hey friend! You need a phone number before you can send a message. <a href="#" className="text-blue-600 font-medium underline">Get your number</a></p>
                </div>

                <Form {...form}>
                  <div className="grid gap-6">
                    <FormItem>
                      <FormLabel>Campaign name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter campaign name" 
                          value={campaignName}
                          onChange={handleCampaignNameChange}
                        />
                      </FormControl>
                      <p className="text-muted-foreground text-xs">This is hidden to your customers</p>
                    </FormItem>

                    <div className="space-y-6">
                      <FormItem>
                        <FormLabel>Send from</FormLabel>
                        <FormControl>
                          <Input placeholder="Select a phone number" disabled />
                        </FormControl>
                      </FormItem>
                      
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={5} 
                            placeholder="Type your message here..." 
                            value={message}
                            onChange={handleMessageChange}
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <div className="flex justify-between">
                          <p className="text-muted-foreground text-xs">Character count: {message.length}/160</p>
                        </div>
                      </FormItem>
                    </div>
                    
                    <div>
                      <div className="mb-4">
                        <h3 className="font-semibold text-base mb-1">Audience</h3>
                        <p className="text-muted-foreground text-sm">Everyone who matches these rules when your text is sent will receive your message.</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <RadioGroup 
                          defaultValue="all"
                          value={selectedAudience} 
                          onValueChange={setSelectedAudience}
                          className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="all" />
                            <label htmlFor="all" className="font-medium cursor-pointer">All Contacts</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="groups" id="groups" />
                            <label htmlFor="groups" className="font-medium cursor-pointer">Groups (people within a group)</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="keywords" id="keywords" />
                            <label htmlFor="keywords" className="font-medium cursor-pointer">Keywords (people who subscribed with keyword)</label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="mb-6">
                        <Button 
                          onClick={importContacts} 
                          disabled={isImporting}
                          className="mb-4 bg-green-500 hover:bg-green-600"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          {isImporting ? "Importing..." : "Import Contacts"}
                        </Button>
                        {contacts.length > 0 && (
                          <p className="text-sm text-green-600">
                            {contacts.length} contacts imported successfully
                          </p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center mb-2">
                            <Users size={16} className="mr-2" />
                            <h4 className="font-medium">Filter groups</h4>
                          </div>
                          <Input placeholder="Select groups" />
                        </div>
                        
                        <div>
                          <div className="flex items-center mb-2">
                            <Tag size={16} className="mr-2" />
                            <h4 className="font-medium">Filter tags</h4>
                          </div>
                          <Input placeholder="Select tags" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">Frequency</h3>
                      <RadioGroup 
                        defaultValue="one-time"
                        value={frequency} 
                        onValueChange={setFrequency} 
                        className="flex space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="one-time" id="one-time" />
                          <label htmlFor="one-time" className="font-medium cursor-pointer">One time</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="recurring" id="recurring" />
                          <label htmlFor="recurring" className="font-medium cursor-pointer">Recurring</label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">Send</h3>
                      <RadioGroup 
                        defaultValue="immediate"
                        value={timing} 
                        onValueChange={setTiming} 
                        className="flex space-x-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="immediate" id="immediate" />
                          <label htmlFor="immediate" className="font-medium cursor-pointer">Immediate</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <label htmlFor="custom" className="font-medium cursor-pointer">Custom date</label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="flex justify-end space-x-4 pt-4">
                      <Button variant="outline">Cancel</Button>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={isSending || contacts.length === 0}
                      >
                        {isSending ? "Sending..." : "Send Campaign"}
                        {isSending ? null : <Mail className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </Form>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SMSCampaign;
