
interface OutputDeviceCollection {
  delete(device: MediaDeviceInfo): boolean;
  get(): Set<MediaDeviceInfo>;
  set(deviceIdOrIds: string | string[]): Promise<void>;
  test(soundUrl?: string): Promise<void>;
}

interface AudioHelper {
  availableInputDevices: Map<string, MediaDeviceInfo>;
  availableOutputDevices: Map<string, MediaDeviceInfo>;
  isOutputSelectionSupported: boolean;
  isVolumeSupported: boolean;
  ringtoneDevices: OutputDeviceCollection;
  speakerDevices: OutputDeviceCollection;
  audioConstraints: MediaTrackConstraints | null;
  inputDevice: MediaDeviceInfo | null;
  inputStream: MediaStream | null;

  addProcessor(processor: any): Promise<void>;
  disconnect(doEnable?: boolean): boolean;
  incoming(doEnable?: boolean): boolean;
  outgoing(doEnable?: boolean): boolean;
  removeProcessor(processor: any): Promise<void>;
  setAudioConstraints(audioConstraints: MediaTrackConstraints): Promise<void>;
  setInputDevice(deviceId: string): Promise<void>;
  unsetAudioConstraints(): Promise<void>;
  unsetInputDevice(): Promise<void>;

  // EventEmitter methods
  addListener(event: string, listener: Function): this;
  emit(event: string, ...args: any[]): boolean;
  eventNames(): (string | symbol)[];
  getMaxListeners(): number;
  listenerCount(event: string): number;
  listeners(event: string): Function[];
  off(event: string, listener: Function): this;
  on(event: string, listener: Function): this;
  once(event: string, listener: Function): this;
  prependListener(event: string, listener: Function): this;
  prependOnceListener(event: string, listener: Function): this;
  rawListeners(event: string): Function[];
  removeAllListeners(event?: string): this;
  removeListener(event: string, listener: Function): this;
  setMaxListeners(n: number): this;
}

interface TwilioDevice {
  audio: AudioHelper;
  edge: string | null;
  home: string | null;
  identity: string;
  isBusy: boolean;
  state: 'unregistered' | 'registering' | 'registered' | 'destroyed';
  token: string;

  connect(options?: any): Promise<any>;
  destroy(): void;
  disconnectAll(): void;
  register(): Promise<void>;
  unregister(): Promise<void>;
  updateOptions(options: any): void;
  updateToken(token: string): void;

  // EventEmitter methods
  on(event: string, listener: Function): this;
  once(event: string, listener: Function): this;
  off(event: string, listener: Function): this;
}

interface Twilio {
  Device: {
    new(token: string, options?: any): TwilioDevice;
    audio?: AudioHelper;
    isSupported: boolean;
    packageName: string;
    version: string;
    runPreflight(token: string, options?: any): any;
  };
  VERSION?: string;
}

interface Window {
  Twilio?: Twilio;
}
