
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Volume2 } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { audioProcessing } from "@/services/audioProcessing";
import { toast } from "@/components/ui/use-toast";

export function GlobalAudioSettings() {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize and load audio devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await audioProcessing.getAudioDevices();
        setAudioDevices(devices);
        
        // Try to get current device from localStorage first, then from service
        let savedDevice;
        try {
          savedDevice = localStorage.getItem('preferredAudioDevice');
        } catch (err) {
          console.warn('Could not access localStorage:', err);
        }
        
        if (savedDevice) {
          setCurrentDevice(savedDevice);
        } else {
          // Get default device from audio processing service
          const defaultDevice = devices.find(d => d.deviceId === 'default')?.deviceId || 
                               (devices.length > 0 ? devices[0].deviceId : '');
          setCurrentDevice(defaultDevice);
        }
      } catch (err) {
        console.error('Error loading audio devices:', err);
      }
    };
    
    loadDevices();
  }, []);
  
  // Handle device selection
  const handleDeviceChange = async (deviceId: string) => {
    setIsLoading(true);
    try {
      const success = await audioProcessing.setAudioDevice(deviceId);
      if (success) {
        setCurrentDevice(deviceId);
        
        // Test the audio
        await audioProcessing.testAudio(deviceId);
        
        toast({
          title: "Audio Device Changed",
          description: "Audio output device has been updated.",
        });
        
        // Save to localStorage
        try {
          localStorage.setItem('preferredAudioDevice', deviceId);
        } catch (err) {
          console.warn('Could not save audio device preference:', err);
        }
      }
    } catch (err) {
      console.error('Error changing audio device:', err);
      toast({
        title: "Error",
        description: "Failed to change audio device.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refresh device list
  const refreshDevices = async () => {
    setIsLoading(true);
    try {
      const devices = await audioProcessing.getAudioDevices();
      setAudioDevices(devices);
      
      toast({
        title: "Audio Devices Refreshed",
        description: `Found ${devices.length} audio output devices.`,
      });
    } catch (err) {
      console.error('Error refreshing devices:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format device name for display
  const formatDeviceName = (device: MediaDeviceInfo) => {
    if (!device.label || device.label === '') {
      return device.deviceId === 'default' ? 'System Default' : `Device ${device.deviceId.substring(0, 4)}`;
    }
    
    let label = device.label;
    if (label.length > 30) {
      label = label.substring(0, 27) + '...';
    }
    
    if (device.deviceId === 'default') {
      label += ' (Default)';
    }
    
    return label;
  };
  
  // Find name of current device
  const currentDeviceName = audioDevices.find(d => d.deviceId === currentDevice)
    ? formatDeviceName(audioDevices.find(d => d.deviceId === currentDevice)!)
    : 'Default Speaker';
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          title="Audio Settings"
        >
          <Volume2 size={16} />
          <span className="hidden md:inline">Audio Device</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Audio Output Device</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {audioDevices.length === 0 ? (
          <DropdownMenuItem disabled>No audio devices found</DropdownMenuItem>
        ) : (
          audioDevices.map(device => (
            <DropdownMenuItem
              key={device.deviceId}
              onClick={() => handleDeviceChange(device.deviceId)}
              className={currentDevice === device.deviceId ? "bg-accent" : ""}
            >
              {formatDeviceName(device)}
            </DropdownMenuItem>
          ))
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={refreshDevices} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Devices'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => audioProcessing.testAudio(currentDevice)}>
          Test Audio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
