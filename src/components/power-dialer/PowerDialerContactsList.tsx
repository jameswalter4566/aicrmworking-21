
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Trash } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PowerDialerContact {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  last_call_timestamp: string | null;
}

const PowerDialerContactsList = () => {
  const [contacts, setContacts] = useState<PowerDialerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContact, setNewContact] = useState({ name: '', phone_number: '' });
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    fetchContacts();

    // Subscribe to changes
    const subscription = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'power_dialer_contacts'
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('power_dialer_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Could not load contacts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    // Basic validation
    if (!newContact.name.trim() || !newContact.phone_number.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and phone number are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAddingContact(true);
      const { error } = await supabase
        .from('power_dialer_contacts')
        .insert([{
          name: newContact.name,
          phone_number: newContact.phone_number,
        }]);

      if (error) throw error;

      setNewContact({ name: '', phone_number: '' });
      toast({
        title: 'Contact Added',
        description: 'The contact has been added successfully.'
      });
      
      // Refresh contacts
      fetchContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to add contact.',
        variant: 'destructive',
      });
    } finally {
      setAddingContact(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('power_dialer_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Contact Deleted',
        description: 'The contact has been removed successfully.'
      });
      
      // Remove from local state
      setContacts(contacts.filter(contact => contact.id !== id));
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact.',
        variant: 'destructive',
      });
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    addContact();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'not_contacted':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-green-100 text-green-800';
      case 'voicemail':
        return 'bg-yellow-100 text-yellow-800';
      case 'no_answer':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="border rounded-md p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Contacts</h2>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={fetchContacts} 
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      <form onSubmit={handleAddContact} className="flex gap-2 mb-4">
        <Input
          placeholder="Name"
          value={newContact.name}
          onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
          className="flex-1"
        />
        <Input
          placeholder="Phone Number"
          value={newContact.phone_number}
          onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
          className="flex-1"
        />
        <Button type="submit" disabled={addingContact}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </form>

      <ScrollArea className="h-[300px]">
        {loading ? (
          <div className="text-center py-4">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No contacts found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>{contact.name}</TableCell>
                  <TableCell>{contact.phone_number}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(contact.status)}`}>
                      {formatStatus(contact.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteContact(contact.id)}
                    >
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
};

export default PowerDialerContactsList;
