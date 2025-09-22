import type { Driver } from '@walkeros/core';

export interface DeployerConfig {
  drivers?: {
    [name: string]: DriverConfig;
  };
}

export interface DriverConfig {
  type: Driver.DriverType;
  credentials?: Record<string, string>;
  settings?: Record<string, unknown>;
  artifactPath?: string;
}

export interface DeploymentResult {
  driver: string;
  status: 'success' | 'failed';
  result?: Driver.DeployResult;
  error?: string;
}

export interface DeploymentContext {
  config: DeployerConfig;
  env?: Driver.Environment;
}
