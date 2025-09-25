export interface SimulateCommandOptions {
  config: string;
  event?: string;
  json?: boolean;
  verbose?: boolean;
}

export interface SimulationResult {
  success: boolean;
  error?: string;
}
