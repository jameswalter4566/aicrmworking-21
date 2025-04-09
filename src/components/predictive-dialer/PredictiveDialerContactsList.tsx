
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Phone, Upload, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { predictiveDialer } from '@/utils/supabase-custom-client';
import { PredictiveDialerContact } from '@/types/predictive-dialer';

interface ContactsListProps {
  onContactSelect?: (contact: PredictiveDialerContact) => void;
}

export const PredictiveDialerContactsList: React.FC<ContactsListProps> = ({ onContactSelect }) => {
  const [contacts, setContacts] = useState<PredictiveDialerContact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', phone_number: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();

    // Set up subscription to contacts table changes
    const channel = predictiveDialer.customSupabase
      .channel('predictive-dialer-contacts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'predictive_dialer_contacts' },
        () => {
          fetchContacts();
        }
      )
      .subscribe();
    
    return () => {
      predictiveDialer.customSupabase.removeChannel(channel);
    };
  }, []);

  const fetchContacts = async () => {
    try {
      const contacts = await predictiveDialer.fetchContacts();
      setContacts(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContact.name || !newContact.phone_number) {
      toast({
        title: "Invalid Input",
        description: "Name and phone number are required.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await predictiveDialer.getContacts().insert([{
        name: newContact.name,
        phone_number: newContact.phone_number,
        status: 'not_contacted'
      }]);
      
      if (error) throw error;
      
      toast({
        title: "Contact Added",
        description: "New contact has been added successfully.",
      });
      
      setNewContact({ name: '', phone_number: '' });
      setIsAddDialogOpen(false);
      fetchContacts();
    } catch (error) {
      console.error("Error adding contact:", error);
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Simple CSV parsing
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
      
      const nameIndex = headers.indexOf('name');
      const phoneIndex = headers.indexOf('phone') !== -1 ? headers.indexOf('phone') : headers.indexOf('phone_number');
      
      if (nameIndex === -1 || phoneIndex === -1) {
        throw new Error('CSV file must have "name" and "phone" or "phone_number" columns');
      }
      
      const contacts = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(value => value.trim());
        const name = values[nameIndex];
        const phone_number = values[phoneIndex];
        
        if (name && phone_number) {
          contacts.push({ name, phone_number, status: 'not_contacted' });
        }
      }
      
      if (contacts.length === 0) {
        throw new Error('No valid contacts found in CSV');
      }
      
      // Insert contacts in batches of 100
      const batchSize = 100;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const { error } = await predictiveDialer.getContacts().insert(batch);
        if (error) throw error;
      }
      
      toast({
        title: "Contacts Imported",
        description: `Successfully imported ${contacts.length} contacts.`,
      });
      
      fetchContacts();
    } catch (error) {
      console.error("Error uploading contacts:", error);
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import contacts.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await predictiveDialer.getContacts().delete().eq('id', id);
      
      if (error) throw error;
      
      setContacts(contacts.filter(contact => contact.id !== id));
      
      toast({
        title: "Contact Deleted",
        description: "Contact has been removed from your list.",
      });
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'contacted':
        return <Badge className="bg-green-500">Contacted</Badge>;
      case 'voicemail':
        return <Badge className="bg-yellow-500">Voicemail</Badge>;
      case 'no_answer':
        return <Badge className="bg-red-500">No Answer</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      default:
        return <Badge className="bg-gray-500">Not Contacted</Badge>;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex justify-between items-center">
          <div>Dialer Contacts</div>
          <div className="flex space-x-2">
            <label className="cursor-pointer">
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={isUploading}
                asChild
              >
                <div>
                  <Upload className="mr-1 h-3 w-3" />
                  Import CSV
                </div>
              </Button>
            </label>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs bg-blue-600">
                  <UserPlus className="mr-1 h-3 w-3" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleContactSubmit}>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="John Smith"
                        value={newContact.name}
                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="+12025550123"
                        value={newContact.phone_number}
                        onChange={(e) => setNewContact({...newContact, phone_number: e.target.value})}
                        required
                      />
                      <p className="text-xs text-gray-500">Include country code (e.g., +1 for US)</p>
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Adding..." : "Add Contact"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No contacts yet.</p>
            <p className="text-sm">Add contacts or import a CSV file to get started.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {contacts.map((contact) => (
              <div 
                key={contact.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <div className="truncate font-medium">{contact.name}</div>
                    <div className="ml-2">
                      {getStatusBadge(contact.status)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 truncate">{contact.phone_number}</div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-100"
                    onClick={() => onContactSelect && onContactSelect(contact)}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                    onClick={() => deleteContact(contact.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictiveDialerContactsList;
