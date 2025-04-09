import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MoreVertical, Edit, Copy, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { predictiveDialer, customSupabase } from "@/utils/supabase-custom-client";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import TwilioDeviceSetup from './TwilioDeviceSetup';

// Define data structures (adjust as necessary)
interface PredictiveDialerAgent {
  id: string;
  name: string;
  status: 'Online' | 'Offline' | 'Busy';
  phone_number: string;
}

interface PredictiveDialerContact {
  id: string;
  name: string;
  phone_number: string;
  status: 'New' | 'Contacted' | 'Do Not Call';
  agent_id?: string | null;
}

interface PredictiveDialerCall {
  id: string;
  contact_id: string;
  agent_id: string;
  start_time: string;
  end_time?: string;
  status: 'Queued' | 'Ringing' | 'InProgress' | 'Completed' | 'Failed';
}

interface PredictiveDialerQueueItem {
  id: string;
  contact_id: string;
  agent_id?: string | null;
  time_added: string;
}

const PredictiveDialerDashboard: React.FC = () => {
  const [agents, setAgents] = useState<PredictiveDialerAgent[]>([]);
  const [contacts, setContacts] = useState<PredictiveDialerContact[]>([]);
  const [calls, setCalls] = useState<PredictiveDialerCall[]>([]);
  const [callQueue, setCallQueue] = useState<PredictiveDialerQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<PredictiveDialerAgent | null>(null);
  const [isAgentOnline, setIsAgentOnline] = useState<boolean>(false);
  const [isTwilioDeviceReady, setIsTwilioDeviceReady] = useState<boolean>(false);
  const [newContactDrawerOpen, setNewContactDrawerOpen] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const agentsData = await predictiveDialer.fetchAgents();
        const contactsData = await predictiveDialer.fetchContacts();
        const callsData = await predictiveDialer.fetchCalls();
        const callQueueData = await predictiveDialer.fetchCallQueue();

        setAgents(agentsData);
        setContacts(contactsData);
        setCalls(callsData);
        setCallQueue(callQueueData);
        setError(null);
      } catch (e: any) {
        setError(e.message);
        toast({
          title: "Error",
          description: e.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Realtime updates for agents
  useEffect(() => {
    const agentsSubscription = customSupabase
      .channel('agents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictive_dialer_agents' },
        (payload) => {
          console.log('Agent change received', payload);
          predictiveDialer.fetchAgents().then(setAgents);
        }
      )
      .subscribe();

    return () => {
      customSupabase.removeChannel(agentsSubscription);
    };
  }, []);

  // Realtime updates for contacts
  useEffect(() => {
    const contactsSubscription = customSupabase
      .channel('contacts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictive_dialer_contacts' },
        (payload) => {
          console.log('Contact change received', payload);
          predictiveDialer.fetchContacts().then(setContacts);
        }
      )
      .subscribe();

    return () => {
      customSupabase.removeChannel(contactsSubscription);
    };
  }, []);

  // Realtime updates for calls
  useEffect(() => {
    const callsSubscription = customSupabase
      .channel('calls')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictive_dialer_calls' },
        (payload) => {
          console.log('Call change received', payload);
          predictiveDialer.fetchCalls().then(setCalls);
        }
      )
      .subscribe();

    return () => {
      customSupabase.removeChannel(callsSubscription);
    };
  }, []);

  // Realtime updates for call queue
  useEffect(() => {
    const callQueueSubscription = customSupabase
      .channel('call_queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictive_dialer_call_queue' },
        (payload) => {
          console.log('Call queue change received', payload);
          predictiveDialer.fetchCallQueue().then(setCallQueue);
        }
      )
      .subscribe();

    return () => {
      customSupabase.removeChannel(callQueueSubscription);
    };
  }, []);

  const handleAgentSelect = (agent: PredictiveDialerAgent) => {
    setCurrentAgent(agent);
    setIsAgentOnline(agent.status === 'Online');
  };

  const handleAgentStatusChange = async (agentId: string, newStatus: 'Online' | 'Offline' | 'Busy') => {
    try {
      const { error } = await predictiveDialer
        .getAgents()
        .update({ status: newStatus })
        .eq('id', agentId);

      if (error) {
        console.error('Error updating agent status:', error);
        toast({
          title: "Error",
          description: "Failed to update agent status.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Agent status updated to ${newStatus}.`,
        });
      }
    } catch (error: any) {
      console.error('Error updating agent status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update agent status.",
        variant: "destructive",
      });
    }
  };

  const handleContactSelect = async (contact: PredictiveDialerContact) => {
    if (!contact || !contact.id) return;

    setSelectedContactId(contact.id);
    
    try {
      await supabase.functions.invoke('initiate-manual-call', {
        body: {
          contactId: contact.id,
          agentId: currentAgent?.id,
        }
      });
      
      toast({
        title: "Call Initiated",
        description: `Calling ${contact.name} at ${contact.phone_number}`,
      });
    } catch (error) {
      console.error('Error initiating manual call:', error);
      toast({
        title: "Call Failed",
        description: "Could not initiate call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactStatusChange = async (contactId: string, newStatus: 'New' | 'Contacted' | 'Do Not Call') => {
    try {
      const { error } = await predictiveDialer
        .getContacts()
        .update({ status: newStatus })
        .eq('id', contactId);

      if (error) {
        console.error('Error updating contact status:', error);
        toast({
          title: "Error",
          description: "Failed to update contact status.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Contact status updated to ${newStatus}.`,
        });
      }
    } catch (error: any) {
      console.error('Error updating contact status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update contact status.",
        variant: "destructive",
      });
    }
  };

  const handleAddToQueue = async (contactId: string) => {
    if (!currentAgent) {
      toast({
        title: "Error",
        description: "Please select an agent first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newQueueItem = {
        id: uuidv4(),
        contact_id: contactId,
        agent_id: currentAgent.id,
        time_added: new Date().toISOString(),
      };

      const { error } = await predictiveDialer
        .getCallQueue()
        .insert(newQueueItem);

      if (error) {
        console.error('Error adding to call queue:', error);
        toast({
          title: "Error",
          description: "Failed to add to call queue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Contact added to call queue.",
        });
      }
    } catch (error: any) {
      console.error('Error adding to call queue:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add to call queue.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromQueue = async (queueItemId: string) => {
    try {
      const { error } = await predictiveDialer
        .getCallQueue()
        .delete()
        .eq('id', queueItemId);

      if (error) {
        console.error('Error removing from call queue:', error);
        toast({
          title: "Error",
          description: "Failed to remove from call queue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Contact removed from call queue.",
        });
      }
    } catch (error: any) {
      console.error('Error removing from call queue:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove from call queue.",
        variant: "destructive",
      });
    }
  };

  const handleCreateContact = async (values: z.infer<typeof contactSchema>) => {
    try {
      const newContact = {
        id: uuidv4(),
        name: values.name,
        phone_number: values.phone_number,
        status: 'New',
        agent_id: currentAgent?.id,
      };

      const { error } = await predictiveDialer
        .getContacts()
        .insert(newContact);

      if (error) {
        console.error('Error creating contact:', error);
        toast({
          title: "Error",
          description: "Failed to create contact.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Contact created successfully.",
        });
        setNewContactDrawerOpen(false);
      }
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create contact.",
        variant: "destructive",
      });
    }
  };

  const contactSchema = z.object({
    name: z.string().min(2, {
      message: "Name must be at least 2 characters.",
    }),
    phone_number: z.string().min(10, {
      message: "Phone number must be at least 10 characters.",
    }),
  })

  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      phone_number: "",
    },
  })

  const handleTwilioDeviceReady = (device: any) => {
    setIsTwilioDeviceReady(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Agents Section */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Agents</CardTitle>
          <CardDescription>Select an agent to manage their status and assign calls.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading agents...</p>
          ) : error ? (
            <p className="text-red-500">Error: {error}</p>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                  <button onClick={() => handleAgentSelect(agent)} className="flex-1 text-left">
                    {agent.name}
                  </button>
                  <Badge variant="secondary">{agent.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <Separator />
        <CardContent>
          {currentAgent ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Selected Agent: {currentAgent.name}</h3>
              <div className="flex items-center space-x-2">
                <Label htmlFor="agent-status">Status:</Label>
                <Select value={currentAgent.status} onValueChange={(value) => handleAgentStatusChange(currentAgent.id, value as 'Online' | 'Offline' | 'Busy')}>
                  <SelectTrigger id="agent-status">
                    <SelectValue placeholder={currentAgent.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Offline">Offline</SelectItem>
                    <SelectItem value="Busy">Busy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setNewContactDrawerOpen(true)}>
                Create Contact
              </Button>
            </div>
          ) : (
            <p>Select an agent to see details.</p>
          )}
        </CardContent>
      </Card>

      {/* Contacts Section */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>Manage contacts and their statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading contacts...</p>
          ) : error ? (
            <p className="text-red-500">Error: {error}</p>
          ) : (
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.phone_number}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{contact.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleContactSelect(contact)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Initiate Call
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddToQueue(contact.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Add to Queue
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Call Queue Section */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Call Queue</CardTitle>
          <CardDescription>Manage the call queue for the selected agent.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading call queue...</p>
          ) : error ? (
            <p className="text-red-500">Error: {error}</p>
          ) : (
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Contact</TableHead>
                    <TableHead>Time Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callQueue.map((queueItem) => {
                    const contact = contacts.find((c) => c.id === queueItem.contact_id);
                    return (
                      <TableRow key={queueItem.id}>
                        <TableCell className="font-medium">{contact?.name || 'Unknown'}</TableCell>
                        <TableCell>{queueItem.time_added}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleRemoveFromQueue(queueItem.id)}>
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* New Contact Drawer */}
      <Drawer open={newContactDrawerOpen} onOpenChange={setNewContactDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create New Contact</DrawerTitle>
            <DrawerDescription>
              Create a new contact for the selected agent.
            </DrawerDescription>
          </DrawerHeader>
          <CardContent>
            <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit(handleCreateContact)} className="space-y-4">
                <FormField
                  control={contactForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="555-555-5555" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Create Contact</Button>
              </form>
            </Form>
          </CardContent>
          <DrawerFooter>
            <DrawerClose>Cancel</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default PredictiveDialerDashboard;
