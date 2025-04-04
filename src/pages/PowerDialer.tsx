import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Phone, PhoneCall, PhoneOff, User } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { twilioService } from "@/services/twilio";
import { thoughtlyService, ThoughtlyContact } from "@/services/thoughtly";

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  disposition: string;
}

const sampleLeads: Lead[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    phone: "555-123-4567",
    email: "john.doe@example.com",
    disposition: "Not Contacted",
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Smith",
    phone: "555-987-6543",
    email: "jane.smith@example.com",
    disposition: "Contacted",
  },
  {
    id: 3,
    firstName: "Robert",
    lastName: "Jones",
    phone: "555-246-8012",
    email: "robert.jones@example.com",
    disposition: "Appointment Set",
  },
];

const PowerDialer = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callProgress, setCallProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);

  const currentLead = leads[currentLeadIndex];

  const startCall = async () => {
    if (!currentLead) return;

    setIsCalling(true);
    setCallProgress(0);

    try {
      // Initiate the Twilio call
      const callSid = await twilioService.startCall({
        to: currentLead.phone,
      });

      // Simulate call progress
      const intervalId = setInterval(() => {
        setCallProgress((prevProgress) => {
          if (prevProgress >= 100) {
            clearInterval(intervalId);
            return 100;
          }
          return prevProgress + 10;
        });
      }, 1000); // Update every 1 second

      // Store the interval ID in state for later cleanup
      // setCallIntervalId(intervalId);
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Call Failed",
        description: "Failed to initiate the call. Please try again.",
        variant: "destructive",
      });
      setIsCalling(false);
      setCallProgress(0);
    }
  };

  const endCall = () => {
    setIsCalling(false);
    setCallProgress(0);
    // if (callIntervalId) {
    //   clearInterval(callIntervalId);
    // }
  };

  const nextLead = () => {
    if (currentLeadIndex < leads.length - 1) {
      setCurrentLeadIndex(currentLeadIndex + 1);
      endCall();
    } else {
      toast({
        title: "No More Leads",
        description: "You have reached the end of the lead list.",
      });
    }
  };

  const openDialog = () => {
    setIsDialogOpen(true);
    if (currentLead) {
      setPhoneNumber(currentLead.phone);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const savePhoneNumber = () => {
    // Update the phone number for the current lead
    if (currentLead) {
      const updatedLeads = [...leads];
      updatedLeads[currentLeadIndex] = {
        ...currentLead,
        phone: phoneNumber,
      };
      setLeads(updatedLeads);
    }
    closeDialog();
  };

  // Update the useEffect hook that loads leads to use our new method
  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      try {
        // First try the new consolidated retrieval method
        const response = await thoughtlyService.retrieveAllLeads({
          limit: 50
        });
        
        if (response?.success && response?.data && response.data.length > 0) {
          // Map the data to the expected format for PowerDialer
          const mappedLeads = response.data.map(contact => {
            let firstName = '', lastName = '';
            if (contact.name) {
              const nameParts = contact.name.split(' ');
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            }
            
            return {
              id: contact.attributes?.id ? Number(contact.attributes.id) : Date.now(),
              firstName: contact.attributes?.firstName || firstName,
              lastName: contact.attributes?.lastName || lastName,
              email: contact.email || '',
              phone: contact.phone_number || '',
              disposition: contact.attributes?.disposition || 'Not Contacted'
            };
          });
          
          setLeads(mappedLeads);
          console.log("Fetched leads for Power Dialer:", mappedLeads);
        } else {
          // If no leads are found or there's an error, use the sample data
          setLeads(sampleLeads);
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
        setLeads(sampleLeads);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeads();
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Power Dialer</h1>
          <Button
            className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
            onClick={nextLead}
            disabled={isCalling || loading}
          >
            Next Lead
          </Button>
        </div>

        {loading ? (
          <div className="text-center">Loading leads...</div>
        ) : currentLead ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Details Card */}
            <Card className="shadow-sm">
              <CardHeader className="bg-crm-blue/5 border-b">
                <CardTitle className="text-lg font-medium">
                  Lead Details
                </CardTitle>
                <CardDescription>Information about the current lead</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {currentLead.firstName} {currentLead.lastName}
                    </h2>
                    <Badge className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                      {currentLead.disposition}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label>Phone Number</Label>
                    <div className="flex items-center justify-between">
                      <p>{currentLead.phone}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={openDialog}
                        disabled={isCalling}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p>{currentLead.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Call Controls Card */}
            <Card className="shadow-sm">
              <CardHeader className="bg-crm-blue/5 border-b">
                <CardTitle className="text-lg font-medium">
                  Call Controls
                </CardTitle>
                <CardDescription>Manage your current call</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {isCalling ? (
                    <>
                      <div className="text-center">
                        <PhoneCall className="h-10 w-10 text-green-500 mx-auto animate-pulse" />
                        <p className="text-lg font-semibold">Calling...</p>
                      </div>
                      <Progress value={callProgress} />
                      <div className="flex items-center justify-between">
                        <Label htmlFor="volume">Volume</Label>
                        <Slider
                          id="volume"
                          defaultValue={[volume]}
                          max={100}
                          step={1}
                          onValueChange={(value) => setVolume(value[0])}
                          className="w-32"
                          disabled={!isCalling}
                        />
                      </div>
                      <Button
                        className="w-full bg-red-500 hover:bg-red-600 rounded-lg"
                        onClick={endCall}
                      >
                        <PhoneOff className="h-4 w-4 mr-2" />
                        End Call
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full bg-green-500 hover:bg-green-600 rounded-lg"
                      onClick={startCall}
                      disabled={isCalling}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Start Call
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center">No leads available.</div>
        )}
      </div>

      {/* Edit Phone Number Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Phone Number</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone Number
              </Label>
              <Input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" onClick={savePhoneNumber}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PowerDialer;
