import type { Env } from '../types';
import {
  managedwriter as mockManagedwriter,
  adapt as mockAdapt,
} from '../__mocks__/@google-cloud/bigquery-storage';

/**
 * Example environment configurations for GCP BigQuery destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual BigQuery SDK dependencies.
 *
 * The Storage Write API mocks (WriterClient, JSONWriter, adapt) are
 * re-exported from the package-local __mocks__ folder so example/test
 * code shares a single source of truth with the jest auto-mock.
 */

// Simple no-op function for mocking
const noop = () => {};

/**
 * Mock BigQuery client class that simulates dataset/table operations
 */
function createMockBigQuery() {
  return class MockBigQuery {
    calls: Array<{ method: string; args: unknown[] }>;
    options: unknown;

    constructor(options?: unknown) {
      this.options = options;
      this.calls = [];
    }

    dataset(datasetId: string) {
      this.calls.push({ method: 'dataset', args: [datasetId] });
      return this;
    }

    table(tableId: string) {
      this.calls.push({ method: 'table', args: [tableId] });
      return this;
    }

    async insert(rows: unknown[]) {
      this.calls.push({ method: 'insert', args: [rows] });
      return Promise.resolve();
    }

    // For backwards compatibility with tests that might check mockFn
    get mockFn() {
      return noop;
    }
  };
}

/**
 * Standard mock environment for push operations
 *
 * Use this for testing BigQuery insert operations without connecting
 * to actual GCP infrastructure.
 */
export const push: Env = {
  get BigQuery() {
    return createMockBigQuery() as unknown as Env['BigQuery'];
  },
  get WriterClient() {
    return mockManagedwriter.WriterClient as unknown as Env['WriterClient'];
  },
  get JSONWriter() {
    return mockManagedwriter.JSONWriter as unknown as Env['JSONWriter'];
  },
  get adapt() {
    return mockAdapt as unknown as Env['adapt'];
  },
  get managedwriterModule() {
    return mockManagedwriter as unknown as Env['managedwriterModule'];
  },
};

export const simulation = ['BigQuery', 'WriterClient', 'JSONWriter', 'adapt'];
