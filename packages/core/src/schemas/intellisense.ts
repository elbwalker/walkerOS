export interface PackageInfo {
  package: string;
  shortName: string;
  type: 'source' | 'destination' | 'transformer';
  platform: 'web' | 'server';
  description?: string;
}

export interface IntelliSenseContext {
  variables?: Record<string, unknown>;
  secrets?: string[];
  stepNames?: {
    sources?: string[];
    destinations?: string[];
    transformers?: string[];
  };
  contract?: Array<{
    entity: string;
    actions: string[];
  }>;
  packages?: PackageInfo[];
  platform?: 'web' | 'server';
}
