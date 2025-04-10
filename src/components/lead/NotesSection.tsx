
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { LeadNote } from '@/services/leadProfile';

interface NotesSectionProps {
  notes: LeadNote[];
  newNote: string;
  setNewNote: (note: string) => void;
  handleAddNote: () => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  newNote,
  setNewNote,
  handleAddNote
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Notes</CardTitle>
        <CardDescription>Record important information about this lead</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex space-x-2">
          <Textarea
            placeholder="Add a note about this lead..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1"
            rows={3}
          />
          <Button 
            onClick={handleAddNote} 
            disabled={!newNote.trim()}
            className="self-end"
          >
            <Send className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>
        
        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map(note => (
              <Card key={note.id} className="border-gray-200">
                <CardContent className="pt-4">
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                    <p>{note.created_by}</p>
                    <p>{format(new Date(note.created_at), 'MMM dd, yyyy h:mm a')}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 opacity-30 mb-2" />
            <p>No notes have been added yet</p>
            <p className="text-sm">Add your first note to keep track of important information</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotesSection;
