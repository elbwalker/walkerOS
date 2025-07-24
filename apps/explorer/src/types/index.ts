// Types for the explorer package

// Main configuration for the explorer
export interface ExplorerConfig {
  selector?: string;
  theme?: 'light' | 'dark' | 'auto';
  showFullScreen?: boolean;
  showCopy?: boolean;
  showFormat?: boolean;
  className?: string;
}

export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  attributes: Record<string, string>;
  html: string;
  elbAttributes: Record<string, string>;
}

export interface ExplorerEvent {
  type: 'open' | 'close' | 'select' | 'update';
  element?: Element;
  html?: string;
  timestamp: number;
}
