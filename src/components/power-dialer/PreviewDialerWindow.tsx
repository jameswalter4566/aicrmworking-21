import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Textarea
} from "@/components/ui/textarea"
import { DialingSessionControls } from './DialingSessionControls';

interface PreviewDialerWindowProps {
  currentCall: any;
  onDisposition: (type: string) => void;
  onEndCall: () => void;
}

const DISPOSITION_TYPES = [
  "Contacted",
  "Left Voicemail",
  "Not Interested",
  "Bad Number",
  "Follow Up",
];

const PreviewDialerWindow = ({ currentCall, onDisposition, onEndCall }: PreviewDialerWindowProps) => {
  const [notes, setNotes] = React.useState("");
  const [disposition, setDisposition] = React.useState(DISPOSITION_TYPES[0]);
  const [session, setSession] = React.useState({
    id: "session-123",
    status: "active",
    name: "Test Session",
    createdAt: new Date(),
  });

  return (
    <div className="space-y-4">
      <DialingSessionControls 
        sessionId={session?.id || null}
        isActive={session?.status === 'active'}
      />
      
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Lead Information</CardTitle>
          <CardDescription>Review lead details and call history</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          {currentCall ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input type="text" value={currentCall.parameters.leadId} disabled />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input type="text" value={currentCall.phoneNumber} disabled />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea placeholder="Add notes about this call" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No active call selected.</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Select value={disposition} onValueChange={setDisposition}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Disposition" />
            </SelectTrigger>
            <SelectContent>
              {DISPOSITION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onDisposition(disposition)}>
              Save Disposition
            </Button>
            <Button onClick={onEndCall}>End Call</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PreviewDialerWindow;
