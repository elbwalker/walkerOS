import type { Env } from '../types';

/**
 * Example environment configurations for GCP BigQuery destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual BigQuery SDK dependencies.
 */

/**
 * Mock BigQuery client class that simulates dataset/table operations
 */
class MockBigQuery {
  mockFn: jest.Mock;
  options: unknown;

  constructor(options?: unknown) {
    this.options = options;
    this.mockFn = jest.fn();
    // Expose mockFn for test assertions - needed for test access pattern
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).mockFn = this.mockFn;
  }

  dataset(datasetId: string) {
    this.mockFn('dataset', datasetId);
    return this;
  }

  table(tableId: string) {
    this.mockFn('table', tableId);
    return this;
  }

  async insert(rows: unknown[]) {
    this.mockFn('insert', rows);
    return Promise.resolve();
  }
}

/**
 * Standard mock environment for push operations
 *
 * Use this for testing BigQuery insert operations without connecting
 * to actual GCP infrastructure.
 */
export const push: Env = {
  BigQuery: MockBigQuery as unknown as Env['BigQuery'],
};
