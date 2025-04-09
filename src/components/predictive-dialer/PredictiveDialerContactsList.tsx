
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PredictiveDialerContact } from '@/types/predictiveDialer';
import { toast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const PredictiveDialerContactsList: React.FC = () => {
  const [contacts, setContacts] = useState<PredictiveDialerContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState<{ name: string; phone_number: string }>({
    name: '',
    phone_number: ''
  });
  const [csvText, setCsvText] = useState('');
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('power_dialer_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async () => {
    try {
      if (!newContact.name || !newContact.phone_number) {
        toast({
          title: "Validation Error",
          description: "Name and phone number are required",
          variant: "destructive"
        });
        return;
      }

      // Format phone number if needed (simple format)
      let formattedPhone = newContact.phone_number.replace(/\D/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+1' + formattedPhone; // Default to US numbers
      }

      const { data, error } = await supabase
        .from('power_dialer_contacts')
        .insert([{
          name: newContact.name,
          phone_number: formattedPhone
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact added successfully"
      });

      setNewContact({ name: '', phone_number: '' });
      setIsAddDialogOpen(false);
      fetchContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive"
      });
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        const { error } = await supabase
          .from('power_dialer_contacts')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Contact deleted successfully"
        });

        fetchContacts();
      } catch (error) {
        console.error('Error deleting contact:', error);
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive"
        });
      }
    }
  };

  const importContactsFromCsv = async () => {
    setIsImporting(true);
    try {
      const lines = csvText.split('\n');
      const contacts: { name: string; phone_number: string }[] = [];

      // Skip header row if present
      const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length >= 2) {
          let name = parts[0].trim();
          let phone = parts[1].trim().replace(/\D/g, '');
          
          // Add country code if not present
          if (!phone.startsWith('+')) {
            phone = '+1' + phone; // Default to US format
          }
          
          contacts.push({ name, phone_number: phone });
        }
      }

      if (contacts.length === 0) {
        toast({
          title: "Error",
          description: "No valid contacts found in CSV",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('power_dialer_contacts')
        .insert(contacts);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${contacts.length} contacts successfully`
      });

      setCsvText('');
      setIsCsvDialogOpen(false);
      fetchContacts();
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast({
        title: "Error",
        description: "Failed to import contacts",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'contacted':
        return <Badge variant="default" className="bg-green-500">Contacted</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case 'voicemail':
        return <Badge variant="default" className="bg-orange-500">Voicemail</Badge>;
      case 'no_answer':
        return <Badge variant="default" className="bg-red-500">No Answer</Badge>;
      default:
        return <Badge variant="default" className="bg-gray-500">Not Contacted</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Contact List</h2>
        <div className="flex gap-2">
          <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Contacts from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 my-4">
                <p className="text-sm text-gray-600">
                  Paste your CSV data below. Format: name, phone_number (one contact per line)
                </p>
                <textarea
                  className="w-full h-40 p-2 border rounded-md"
                  placeholder="John Doe, +11234567890\nJane Smith, +10987654321"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                ></textarea>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsCsvDialogOpen(false)} variant="outline">Cancel</Button>
                <Button onClick={importContactsFromCsv} disabled={isImporting}>
                  {isImporting ? 'Importing...' : 'Import Contacts'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 my-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    placeholder="John Doe"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <Input
                    placeholder="+11234567890"
                    value={newContact.phone_number}
                    onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsAddDialogOpen(false)} variant="outline">Cancel</Button>
                <Button onClick={handleAddContact}>Add Contact</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-600">No contacts found. Add some contacts to get started.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Call</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.phone_number}</TableCell>
                  <TableCell>{getStatusBadge(contact.status)}</TableCell>
                  <TableCell>
                    {contact.last_call_timestamp ? new Date(contact.last_call_timestamp).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{contact.notes || '-'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
