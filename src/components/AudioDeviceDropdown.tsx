
import { useState, useEffect } from "react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Speaker, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface AudioDeviceDropdownProps {
  devices: MediaDeviceInfo[];
  currentDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  onRefreshDevices: () => Promise<MediaDeviceInfo[]>;
  disabled?: boolean;
}

const AudioDeviceDropdown: React.FC<AudioDeviceDropdownProps> = ({
  devices,
  currentDeviceId,
  onDeviceChange,
  onRefreshDevices,
  disabled = false
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Format the device name for display
  const formatDeviceName = (device: MediaDeviceInfo): string => {
    if (!device.label) {
      return device.deviceId === 'default' ? 'System Default' : `Device ${device.deviceId.substring(0, 4)}`;
    }
    
    let label = device.label;
    if (label.length > 30) {
      label = `${label.substring(0, 27)}...`;
    }
    
    if (device.deviceId === 'default') {
      label += ' (Default)';
    }
    
    return label;
  };
  
  // Handle refreshing the device list
  const handleRefreshDevices = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefreshDevices();
      toast({
        title: "Audio Devices Refreshed",
        description: `Found ${devices.length} audio output devices.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh audio devices.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button variant="outline" size="icon" title="Select audio output device">
            <Speaker className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuRadioGroup value={currentDeviceId} onValueChange={onDeviceChange}>
            {devices.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No audio devices found
              </div>
            ) : (
              devices.map((device) => (
                <DropdownMenuRadioItem 
                  key={device.deviceId} 
                  value={device.deviceId}
                  className="truncate"
                >
                  {formatDeviceName(device)}
                </DropdownMenuRadioItem>
              ))
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleRefreshDevices} 
        disabled={isRefreshing || disabled}
        title="Refresh devices list"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
};

export default AudioDeviceDropdown;
