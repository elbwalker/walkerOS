declare module '@google-cloud/bigquery' {
  interface SetupHarnessPatch {
    datasetExists?: boolean;
    tableExists?: boolean;
    tableMetadata?: {
      timePartitioning?: { type?: string; field?: string };
      clustering?: { fields?: string[] };
      schema?: {
        fields?: Array<{ name?: string; type?: string; mode?: string }>;
      };
    };
    datasetCreateError?: { code: number; message: string } | null;
    tableCreateError?: { code: number; message: string } | null;
    getMetadataError?: Error | null;
  }

  export function __setSetupHarness(patch: SetupHarnessPatch): void;
  export function __resetSetupHarness(): void;
  export function __getSetupCalls(): jest.Mock;
}

export {};
