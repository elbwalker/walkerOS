import type { Env, QueryClient, TableMetadataShape } from '../types';
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

/**
 * Mock BigQuery query client: dataset and table provisioning calls resolve as
 * if both already exist.
 */
function createMockBigQuery() {
  return class MockBigQuery implements QueryClient {
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

    async exists(): Promise<[boolean]> {
      this.calls.push({ method: 'exists', args: [] });
      return [true];
    }

    async create(options: unknown): Promise<void> {
      this.calls.push({ method: 'create', args: [options] });
    }

    async getMetadata(): Promise<[TableMetadataShape]> {
      this.calls.push({ method: 'getMetadata', args: [] });
      return [{}];
    }
  };
}

/**
 * Standard mock environment for push operations
 *
 * Use this for testing BigQuery Storage Write appends without connecting
 * to actual GCP infrastructure.
 */
export const push: Env = {
  get BigQuery() {
    return createMockBigQuery();
  },
  get WriterClient() {
    return mockManagedwriter.WriterClient;
  },
  get JSONWriter() {
    return mockManagedwriter.JSONWriter;
  },
  get adapt() {
    return mockAdapt;
  },
};

/**
 * Every row goes through the writer's `appendRows`; the writer is built from
 * `JSONWriter` in init, so the path continues on the constructed instance.
 * Constructors are not recorded: their arguments carry credentials.
 */
export const simulation = ['call:JSONWriter.appendRows'];
