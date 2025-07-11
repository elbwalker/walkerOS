export interface Fn {
  name: string; // original function name
  id: string; // destination id
  type: string; // destination type
}

export type OnCall = (context: Fn, args: unknown[]) => void;

export interface Config {
  dryRun?: boolean;
  mockReturn?: unknown;
  onCall?: OnCall;
}

export type Wrap = <T>(name: string, originalFn: T) => T;
