export interface WalkerOSConfig {
  enabled: boolean;
}

export interface WalkerOSAddonConfig extends WalkerOSConfig {
  // Logging configuration
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  // Custom logging function
  customLogger?: (message: string, data?: unknown) => void;
  // Enable/disable automatic tracking
  autoTrack?: boolean;
  // Custom event prefix
  eventPrefix?: string;
}