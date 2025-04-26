import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Phone, 
  UserX, 
  PhoneOff, 
  MessageSquare, 
  Ban, 
  PhoneMissed,
  Clock,
  RotateCcw,
  Pause,
  StopCircle,
  Play,
  Trash2,
  List,
  Loader2,
  Mail,
  MapPin
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import LeadSelectionPanel from './LeadSelectionPanel';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import DialerQueueMonitor from './DialerQueueMonitor';
import { AutoDialerController } from './AutoDialerController';
import { twilioService } from "@/services/twilio";
import { LineDisplay } from './LineDisplay';
import { useCallStatus } from '@/hooks/use-call-status';
import { LeadDetailsPanel } from './LeadDetailsPanel';
import DispositionSelector from '@/components/DispositionSelector';
import { leadProfileService } from '@/services/leadProfile';
import { ConnectedLeadPanel } from './ConnectedLeadPanel';

interface PreviewDialerWindowProps {
  currentCall: any;
  onDisposition: (type: string) => void;
  onEndCall: () => void;
}

const PreviewDialerWindow: React.FC<PreviewDialerWindowProps> = ({
  currentCall,
  onDisposition,
  onEndCall
}) => {
  // ... keep existing code
};

export default PreviewDialerWindow;
