
import { useState, useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, Volume2 } from "lucide-react";

interface AudioDeviceSelectorProps {
  devices: MediaDeviceInfo[];
  currentDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  onRefreshDevices: () => Promise<MediaDeviceInfo[]>;
  onTestAudio: (deviceId?: string) => Promise<boolean>;
  disabled?: boolean;
}

const AudioDeviceSelector = ({
  devices,
  currentDeviceId,
  onDeviceChange,
  onRefreshDevices,
  onTestAudio,
  disabled = false
}: AudioDeviceSelectorProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Format device name for display
  const formatDeviceName = (device: MediaDeviceInfo) => {
    if (!device.label || device.label === '') {
      return device.deviceId === 'default' ? 'System Default' : `Device ${device.deviceId.substring(0, 4)}`;
    }
    
    // Shorten very long device names
    let label = device.label;
    if (label.length > 30) {
      label = label.substring(0, 27) + '...';
    }
    
    // Mark default device
    if (device.deviceId === 'default') {
      label = `${label} (Default)`;
    }
    
    return label;
  };

  // Handle device refresh
  const handleRefreshDevices = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefreshDevices();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle test audio
  const handleTestAudio = async () => {
    if (isTesting) return;
    
    setIsTesting(true);
    try {
      await onTestAudio(currentDeviceId);
    } finally {
      setIsTesting(false);
    }
  };

  // Request device permissions on component mount
  useEffect(() => {
    // This will trigger the browser's permission dialog for devices
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log("Audio permission granted");
        // Re-enumerate devices now that we have permission
        handleRefreshDevices();
      })
      .catch(err => {
        console.error("Error getting audio permissions:", err);
      });
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select 
          value={currentDeviceId || 'default'} 
          onValueChange={onDeviceChange}
          disabled={disabled || devices.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select speaker" />
          </SelectTrigger>
          <SelectContent>
            {devices.length === 0 && (
              <SelectItem value="none">No audio devices found</SelectItem>
            )}
            {devices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {formatDeviceName(device)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefreshDevices}
          disabled={isRefreshing || disabled}
          title="Refresh devices list"
        >
          <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleTestAudio}
          disabled={isTesting || disabled || !currentDeviceId}
          title="Test selected audio device"
        >
          <Volume2 size={18} className={isTesting ? "animate-pulse" : ""} />
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Select the speaker device you want to use for calls
      </p>
    </div>
  );
};

export default AudioDeviceSelector;
