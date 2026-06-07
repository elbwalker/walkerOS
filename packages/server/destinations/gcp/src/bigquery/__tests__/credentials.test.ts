jest.mock('@google-cloud/bigquery');
jest.mock('@google-cloud/bigquery-storage');

import { getConfig } from '../config';
import type { PartialConfig } from '../types';
import * as examples from '../examples';
import { createMockLogger } from '@walkeros/core';

const { env } = examples;

const serviceAccount = {
  client_email: 'sa@example.com',
  private_key: '-----BEGIN PRIVATE KEY-----',
};

interface CapturedOptions {
  projectId?: string;
  credentials?: { client_email?: string; private_key?: string };
  apiEndpoint?: string;
}

function hasOptions(value: unknown): value is { options: CapturedOptions } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { options?: unknown } = value;
  return typeof candidate.options === 'object' && candidate.options !== null;
}

/**
 * The example `env.push.BigQuery` mock records its constructor options on the
 * instance (`this.options`). getConfig stores that instance as settings.client,
 * so the captured options are read back here without any cast.
 */
function capturedOptions(partialConfig: PartialConfig): CapturedOptions {
  const config = getConfig(partialConfig, env.push, createMockLogger());
  const client: unknown = config.settings.client;
  if (!hasOptions(client))
    throw new Error('mock client did not capture options');
  return client.options;
}

describe('BigQuery config.credentials', () => {
  test('object config.credentials reaches the client options', () => {
    const options = capturedOptions({
      settings: { projectId: 'p', datasetId: 'd', tableId: 't' },
      credentials: serviceAccount,
    });

    expect(options.projectId).toBe('p');
    expect(options.credentials).toEqual(serviceAccount);
  });

  test('string config.credentials is parsed before reaching client options', () => {
    const options = capturedOptions({
      settings: { projectId: 'p', datasetId: 'd', tableId: 't' },
      credentials: JSON.stringify(serviceAccount),
    });

    expect(options.credentials).toEqual(serviceAccount);
  });

  test('settings.bigquery passthrough is preserved alongside credentials', () => {
    const options = capturedOptions({
      settings: {
        projectId: 'p',
        datasetId: 'd',
        tableId: 't',
        bigquery: { apiEndpoint: 'http://localhost:9050' },
      },
      credentials: serviceAccount,
    });

    expect(options.apiEndpoint).toBe('http://localhost:9050');
    expect(options.credentials).toEqual(serviceAccount);
  });

  test('no config.credentials: client options carry no credentials', () => {
    const options = capturedOptions({
      settings: { projectId: 'p', datasetId: 'd', tableId: 't' },
    });

    expect(options.credentials).toBeUndefined();
  });
});
