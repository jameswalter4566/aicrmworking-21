
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Volume2, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export interface AudioDeviceDropdownProps {
  devices: MediaDeviceInfo[];
  currentDeviceId: string;
  onDeviceChange: (deviceId: string) => Promise<boolean>;
  onRefreshDevices: () => Promise<MediaDeviceInfo[]>;
  disabled?: boolean;
}

export default function AudioDeviceDropdown({
  devices,
  currentDeviceId,
  onDeviceChange,
  onRefreshDevices,
  disabled = false
}: AudioDeviceDropdownProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleDeviceChange = async (deviceId: string) => {
    try {
      await onDeviceChange(deviceId);
      toast({
        title: "Audio Device Changed",
        description: "The audio output device has been updated.",
      });
      return true;
    } catch (error) {
      console.error("Error changing audio device:", error);
      toast({
        title: "Device Change Failed",
        description: "Could not change audio output device.",
        variant: "destructive",
      });
      return false;
    }
  };
  
  const handleRefreshDevices = async () => {
    setIsRefreshing(true);
    try {
      const updatedDevices = await onRefreshDevices();
      toast({
        title: "Devices Refreshed",
        description: `Found ${updatedDevices?.length || 0} audio devices.`,
      });
    } catch (error) {
      console.error("Error refreshing devices:", error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh audio devices list.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size="icon"
          title="Audio device options"
        >
          <Volume2 size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={handleRefreshDevices}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          Refresh Devices
        </DropdownMenuItem>
        <div className="px-2 py-1.5 text-sm font-semibold">Output Devices</div>
        {devices.length === 0 ? (
          <DropdownMenuItem disabled>No devices found</DropdownMenuItem>
        ) : (
          devices.map((device) => (
            <DropdownMenuItem
              key={device.deviceId}
              className={
                device.deviceId === currentDeviceId
                  ? "bg-accent text-accent-foreground"
                  : ""
              }
              onClick={() => handleDeviceChange(device.deviceId)}
            >
              {device.label || `Device ${device.deviceId.substring(0, 5)}...`}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
