const mockFn = jest.fn(); // .mockImplementation(console.log);

class BigQuery {
  constructor() {
    (this as any).mockFn = mockFn; // Expose the mockFn
  }

  dataset() {
    mockFn('dataset', ...arguments);
    return this;
  }

  table() {
    mockFn('table', ...arguments);
    return this;
  }

  insert() {
    mockFn('insert', ...arguments);
    return this;
  }
}

export { BigQuery };
