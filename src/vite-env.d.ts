
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Create a more detailed interface for the Twilio Device
interface TwilioDeviceInterface {
  new(token: string, options?: any): TwilioDeviceInstance;
  [key: string]: any;
}

interface TwilioDeviceInstance {
  on(event: string, callback: Function): void;
  connect(options?: any): any;
  disconnectAll(): void;
  destroy(): void;
  register(): void;
  unregister(): void;
  updateToken(token: string): void;
  activeDevice?: any;
  info?: { toString: () => string };
  [key: string]: any;
}

// Declare Twilio on the window object
interface Window {
  Twilio: {
    Device: TwilioDeviceInterface;
    VERSION?: string;
    [key: string]: any;
  };
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

// Declare global Twilio object
declare namespace Twilio {
  interface DeviceOptions {
    codecPreferences?: string[];
    fakeLocalDTMF?: boolean;
    enableRingingState?: boolean;
    debug?: boolean;
  }

  interface Device {
    new(token: string, options?: DeviceOptions): Device;
    on(event: string, callback: Function): void;
    connect(options?: any): any;
    disconnectAll(): void;
    destroy(): void;
    register(): void;
    unregister(): void;
    updateToken(token: string): void;
  }
  
  interface Call {
    disconnect(): void;
    mute(): void;
    unmute(): void;
    on(event: string, callback: Function): void;
    status(): string;
    parameters: any;
  }
}
