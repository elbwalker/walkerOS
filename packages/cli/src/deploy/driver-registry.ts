import type { Driver } from '@walkeros/core';

/**
 * Stubbed driver registry for development purposes
 * This will be replaced with actual drivers when implemented
 */
export const drivers: Record<string, Driver.Instance> = {
  gcp: {
    config: {
      type: 'ingest-gcp',
      stage: 'dev',
      credentials: {},
      settings: {},
    },
    async init() {
      // Stub implementation
      return undefined;
    },
    async deploy() {
      // Stub implementation - just return fake result
      return {
        url: 'https://fake-gcp-endpoint.com/function',
        metadata: {
          functionName: 'walkeros-stub',
          region: 'us-central1',
          runtime: 'nodejs18',
        },
      };
    },
  },
  // Future drivers (stubbed):
  aws: {
    config: {
      type: 'ingest-aws',
      stage: 'dev',
      credentials: {},
      settings: {},
    },
    async init() {
      return undefined;
    },
    async deploy() {
      return {
        url: 'https://fake-aws-endpoint.com/lambda',
        metadata: {
          functionName: 'walkeros-stub',
          region: 'us-east-1',
          runtime: 'nodejs18.x',
        },
      };
    },
  },
  cloudflare: {
    config: {
      type: 'host-cloudflare',
      stage: 'dev',
      credentials: {},
      settings: {},
    },
    async init() {
      return undefined;
    },
    async deploy() {
      return {
        url: 'https://fake-worker.user.workers.dev',
        metadata: {
          workerName: 'walkeros-stub',
          zone: 'example.com',
        },
      };
    },
  },
} as const;

export type AvailableDrivers = keyof typeof drivers;
