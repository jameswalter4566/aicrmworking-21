
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface Contact {
  phone_number: string;
  firstName: string;
  lastName: string;
}

interface ManualContactEntryProps {
  onContactsAdded: (contacts: Contact[]) => void;
}

const ManualContactEntry = ({ onContactsAdded }: ManualContactEntryProps) => {
  const [contacts, setContacts] = useState<Contact[]>([
    { phone_number: "", firstName: "", lastName: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addContactField = () => {
    setContacts([...contacts, { phone_number: "", firstName: "", lastName: "" }]);
  };

  const removeContactField = (index: number) => {
    const newContacts = [...contacts];
    newContacts.splice(index, 1);
    setContacts(newContacts);
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  const handleAddContacts = () => {
    // Filter out any contacts without phone numbers
    const validContacts = contacts.filter(contact => contact.phone_number.trim() !== "");
    
    if (validContacts.length === 0) {
      toast({
        title: "No valid contacts",
        description: "Please add at least one contact with a phone number.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format contacts for consistency with the expected structure
      const formattedContacts = validContacts.map(contact => ({
        phone_number: contact.phone_number,
        firstName: contact.firstName,
        lastName: contact.lastName,
        // Add required properties for the SMS function
        attributes: {
          firstName: contact.firstName,
          lastName: contact.lastName
        }
      }));
      
      // Pass the formatted contacts to the parent component
      onContactsAdded(formattedContacts);
      
      // Reset the form with one empty contact
      setContacts([{ phone_number: "", firstName: "", lastName: "" }]);
      
      toast({
        title: "Contacts added",
        description: `${validContacts.length} contacts added to campaign.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error adding contacts:", error);
      toast({
        title: "Error adding contacts",
        description: "An error occurred while adding contacts.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-5 mb-4">
      <h3 className="text-lg font-semibold mb-4">Manual Contact Entry</h3>
      
      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div key={index} className="grid grid-cols-[1fr,1fr,1.5fr,auto] gap-3 items-center">
            <div>
              <Label htmlFor={`firstName-${index}`} className="text-xs mb-1 block">First Name</Label>
              <Input
                id={`firstName-${index}`}
                value={contact.firstName}
                onChange={(e) => updateContact(index, "firstName", e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <Label htmlFor={`lastName-${index}`} className="text-xs mb-1 block">Last Name</Label>
              <Input
                id={`lastName-${index}`}
                value={contact.lastName}
                onChange={(e) => updateContact(index, "lastName", e.target.value)}
                placeholder="Last name"
              />
            </div>
            <div>
              <Label htmlFor={`phone-${index}`} className="text-xs mb-1 block">Phone Number*</Label>
              <Input
                id={`phone-${index}`}
                value={contact.phone_number}
                onChange={(e) => updateContact(index, "phone_number", e.target.value)}
                placeholder="Phone number"
                required
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-5"
              onClick={() => removeContactField(index)}
              disabled={contacts.length === 1}
            >
              <Trash className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={addContactField}
            className="mt-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Contact
          </Button>
          
          <Button 
            type="button"
            onClick={handleAddContacts}
            className="mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "Adding..."
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add to Campaign
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ManualContactEntry;
