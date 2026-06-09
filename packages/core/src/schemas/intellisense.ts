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
    stores?: string[];
  };
  flowNames?: string[];
  contract?: Array<{
    entity: string;
    actions: string[];
    /**
     * Per-action `data` property info derived from the resolved contract
     * schema. Keyed by action, each entry maps a `data` property name to its
     * type, description, and whether it is required. Empty object when the
     * action schema declares no `data` properties.
     */
    properties?: Record<
      string,
      Record<
        string,
        { type?: string; description?: string; required?: boolean }
      >
    >;
  }>;
  packages?: PackageInfo[];
  platform?: 'web' | 'server';
}
