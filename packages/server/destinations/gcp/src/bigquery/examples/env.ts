import type { Env } from '../types';

/**
 * Example environment configurations for GCP BigQuery destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual BigQuery SDK dependencies.
 */

// Simple no-op function for mocking
const noop = () => {};

/**
 * Creates a mock BigQuery client class that records dataset, table, and insert invocations for tests.
 *
 * @returns A MockBigQuery class whose instances expose `calls` (array of recorded calls), `options` (constructor options), methods `dataset`, `table`, and `insert`, and a `mockFn` getter for backwards compatibility.
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
};