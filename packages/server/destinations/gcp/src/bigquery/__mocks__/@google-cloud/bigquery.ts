const mockFn = jest.fn();

interface TableMetadata {
  timePartitioning?: { type?: string; field?: string };
  clustering?: { fields?: string[] };
  schema?: { fields?: Array<{ name?: string; type?: string; mode?: string }> };
}

interface SetupHarness {
  datasetExists: boolean;
  tableExists: boolean;
  tableMetadata: TableMetadata;
  datasetCreateError: { code: number; message: string } | null;
  tableCreateError: { code: number; message: string } | null;
  getMetadataError: Error | null;
}

const harness: SetupHarness = {
  datasetExists: false,
  tableExists: false,
  tableMetadata: {},
  datasetCreateError: null,
  tableCreateError: null,
  getMetadataError: null,
};

class CodeError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

class MockTable {
  async exists(): Promise<[boolean]> {
    mockFn('table.exists');
    return [harness.tableExists];
  }
  async create(options: unknown): Promise<unknown> {
    mockFn('table.create', options);
    if (harness.tableCreateError) {
      throw new CodeError(
        harness.tableCreateError.code,
        harness.tableCreateError.message,
      );
    }
    return undefined;
  }
  async getMetadata(): Promise<[TableMetadata]> {
    mockFn('table.getMetadata');
    if (harness.getMetadataError) {
      throw harness.getMetadataError;
    }
    return [harness.tableMetadata];
  }
}

class MockDataset {
  async exists(): Promise<[boolean]> {
    mockFn('dataset.exists');
    return [harness.datasetExists];
  }
  async create(options: unknown): Promise<unknown> {
    mockFn('dataset.create', options);
    if (harness.datasetCreateError) {
      throw new CodeError(
        harness.datasetCreateError.code,
        harness.datasetCreateError.message,
      );
    }
    return undefined;
  }
  table(): MockTable {
    mockFn('table');
    return new MockTable();
  }
}

class BigQuery {
  mockFn = mockFn;

  dataset(...args: unknown[]): MockDataset {
    mockFn('dataset', ...args);
    return new MockDataset();
  }

  table(...args: unknown[]): this {
    mockFn('table', ...args);
    return this;
  }

  insert(...args: unknown[]): this {
    mockFn('insert', ...args);
    return this;
  }
}

// Test-only helpers, not part of the real SDK. Used by setup tests to
// program dataset/table state without `as never` casts in the test file.
function __setSetupHarness(patch: Partial<SetupHarness>): void {
  Object.assign(harness, patch);
}

function __resetSetupHarness(): void {
  harness.datasetExists = false;
  harness.tableExists = false;
  harness.tableMetadata = {};
  harness.datasetCreateError = null;
  harness.tableCreateError = null;
  harness.getMetadataError = null;
}

function __getSetupCalls(): jest.Mock {
  return mockFn;
}

export { BigQuery, __setSetupHarness, __resetSetupHarness, __getSetupCalls };
