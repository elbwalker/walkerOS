export interface PackageInfo {
  package: string;
  shortName: string;
  type: 'source' | 'destination' | 'transformer';
  platform: 'web' | 'server';
  description?: string;
}

export interface IntelliSenseContext {
  /** Variable names and values from the flow's `variables` section */
  variables?: Record<string, string | number | boolean>;

  /** Definition names from the flow's `definitions` section */
  definitions?: Record<string, unknown>;

  /** Secret names available in the project (values are NOT included) */
  secrets?: string[];

  /** Step names from the current flow config, by type */
  stepNames?: {
    sources?: string[];
    destinations?: string[];
    transformers?: string[];
  };

  /** Contract entities and their actions */
  contract?: Array<{
    entity: string;
    actions: string[];
  }>;

  /** Raw contract object for $contract completions and mapping hints */
  contractRaw?: Record<string, unknown>;

  /** Available packages for autocomplete */
  packages?: PackageInfo[];

  /** Current platform context (web or server) */
  platform?: 'web' | 'server';

  /** Store IDs from the active flow's `stores` map. Enables `$store.` completion. */
  stores?: string[];

  /** Known environment variable names. If omitted, `$env.` offers only the prefix. */
  envNames?: string[];
}
