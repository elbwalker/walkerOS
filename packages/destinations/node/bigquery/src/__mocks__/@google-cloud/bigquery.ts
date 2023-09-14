const mockFn = jest.fn(); // .mockImplementation(console.log);

class BigQuery {
  constructor() {
    (this as any).mockFn = mockFn; // Expose the mockFn
  }

  dataset() {
    mockFn('dataset', ...arguments);
    return this;
  }

  createDataset() {
    mockFn('createDataset', ...arguments);
    return this;
  }

  createTable() {
    mockFn('createTable', ...arguments);
    return this;
  }
}
export { BigQuery };
