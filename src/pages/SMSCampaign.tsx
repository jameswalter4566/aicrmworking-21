
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smile } from "lucide-react";
import SMSSidebar from "@/components/sms/SMSSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";

const SMSCampaign = () => {
  const navigate = useNavigate();
  const [messageText, setMessageText] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('all-contacts');
  const [selectedFrequency, setSelectedFrequency] = useState('one-time');
  const [selectedSendTime, setSelectedSendTime] = useState('immediate');
  
  const form = useForm();

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen overflow-hidden w-full">
        <SMSSidebar />
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8 flex items-center">
              <Button 
                variant="outline" 
                className="rounded-full mr-4"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">New Campaign</h1>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4 mb-6">
                    <p className="flex items-center text-sm">
                      <span className="mr-2">👋</span>
                      Hey friend! You need a phone number before you can send a message. 
                      <a href="#" className="text-blue-600 ml-1 font-medium">
                        Get your number
                      </a>
                    </p>
                  </div>
                  
                  <form className="space-y-6">
                    <div>
                      <FormLabel>Campaign name</FormLabel>
                      <Input 
                        placeholder="Enter campaign name" 
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">This is hidden to your customers</p>
                    </div>
                    
                    <div>
                      <FormLabel>Send from</FormLabel>
                      <Input 
                        placeholder="Select a phone number" 
                        className="mt-1 bg-gray-50"
                        disabled
                      />
                    </div>
                    
                    <div>
                      <FormLabel>Message</FormLabel>
                      <Textarea 
                        placeholder="Type your message here..." 
                        className="mt-1 min-h-[120px]"
                        value={messageText}
                        onChange={handleMessageChange}
                      />
                      <div className="flex items-center mt-2">
                        <button type="button" className="p-1.5 rounded-full hover:bg-gray-100">
                          <Smile className="h-5 w-5 text-gray-500" />
                        </button>
                        <div className="ml-auto text-xs text-gray-500">
                          {messageText.length}/160 characters
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Everyone who matches these rules when your text is sent will receive your message.</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="groups" 
                            name="audience-rule" 
                            className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500" 
                          />
                          <label htmlFor="groups" className="ml-2 text-sm text-gray-700">Groups (people within a group)</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="keywords" 
                            name="audience-rule" 
                            className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500" 
                          />
                          <label htmlFor="keywords" className="ml-2 text-sm text-gray-700">Keywords (people who subscribed with keyword)</label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Audience (1)</h3>
                      <div className="inline-flex items-center px-3 py-1.5 bg-yellow-50 rounded-lg border border-yellow-100">
                        <span className="flex items-center">
                          <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          All Contacts
                        </span>
                      </div>
                      <div className="mt-3">
                        <Button variant="outline" className="mr-2 border-dashed">
                          + Filter groups
                        </Button>
                        <Button variant="outline" className="border-dashed">
                          + Filter tags
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-3">Frequency</h3>
                      <div className="flex gap-4">
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="one-time" 
                            name="frequency" 
                            className="h-4 w-4 text-pink-600" 
                            checked={selectedFrequency === 'one-time'}
                            onChange={() => setSelectedFrequency('one-time')}
                          />
                          <label htmlFor="one-time" className="ml-2 text-sm text-gray-700">One time</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="recurring" 
                            name="frequency" 
                            className="h-4 w-4 text-pink-600" 
                            checked={selectedFrequency === 'recurring'}
                            onChange={() => setSelectedFrequency('recurring')}
                          />
                          <label htmlFor="recurring" className="ml-2 text-sm text-gray-700">Recurring</label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-3">Send</h3>
                      <div className="flex gap-4">
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="immediate" 
                            name="send-time" 
                            className="h-4 w-4 text-pink-600" 
                            checked={selectedSendTime === 'immediate'}
                            onChange={() => setSelectedSendTime('immediate')}
                          />
                          <label htmlFor="immediate" className="ml-2 text-sm text-gray-700">Immediate</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            id="custom-date" 
                            name="send-time" 
                            className="h-4 w-4 text-pink-600"
                            checked={selectedSendTime === 'custom-date'}
                            onChange={() => setSelectedSendTime('custom-date')}
                          />
                          <label htmlFor="custom-date" className="ml-2 text-sm text-gray-700">Custom date</label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                      <Button variant="dialer" size="lg">
                        Send Campaign
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
              
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="border-b pb-3 mb-4">
                    <h3 className="font-medium">Preview</h3>
                    <Button variant="outline" size="sm" className="mt-2 w-full text-sm">
                      Send test
                    </Button>
                  </div>
                  <div className="min-h-[300px] flex items-center justify-center text-center p-6">
                    {messageText ? (
                      <p className="text-sm">{messageText}</p>
                    ) : (
                      <p className="text-sm text-gray-400">This is a preview of your message</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SMSCampaign;
