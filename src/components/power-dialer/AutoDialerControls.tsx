
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AutoDialerConfig } from '@/hooks/use-auto-dialer';

interface AutoDialerControlsProps {
  config: AutoDialerConfig;
  onConfigChange: (config: AutoDialerConfig) => void;
  remainingTimeout: number | null;
}

export function AutoDialerControls({ 
  config, 
  onConfigChange,
  remainingTimeout 
}: AutoDialerControlsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Auto-Dialer Controls</CardTitle>
          <Badge variant={config.enabled ? "default" : "secondary"}>
            {config.enabled ? 'Active' : 'Disabled'}
          </Badge>
        </div>
        <CardDescription>
          Configure automatic dialing settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-dialer-enabled">Enable Auto-Dialer</Label>
          <Switch
            id="auto-dialer-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => onConfigChange({ ...config, enabled })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Delay Between Calls</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.delayBetweenCalls]}
              onValueChange={([value]) => 
                onConfigChange({ ...config, delayBetweenCalls: value })}
              min={1000}
              max={10000}
              step={500}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-20">
              {(config.delayBetweenCalls / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>No Answer Timeout</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.noAnswerTimeout]}
              onValueChange={([value]) => 
                onConfigChange({ ...config, noAnswerTimeout: value })}
              min={15000}
              max={60000}
              step={5000}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-20">
              {(config.noAnswerTimeout / 1000)}s
            </span>
          </div>
        </div>

        {remainingTimeout !== null && (
          <div className="mt-4 flex items-center justify-between">
            <Label>Call Timeout In</Label>
            <Badge variant="outline">
              {Math.ceil(remainingTimeout / 1000)}s
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
