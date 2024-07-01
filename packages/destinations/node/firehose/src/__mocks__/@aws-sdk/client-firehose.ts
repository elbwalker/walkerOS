const mockFn = jest.fn(); //.mockImplementation(console.log);

export class FirehoseClient {
  constructor() {
    (this as any).mockFn = mockFn; // Expose the mockFn
  }

  send() {
    mockFn('send', ...arguments);
    return this;
  }
}

export class PutRecordBatchCommand {
  constructor() {
    mockFn('new', ...arguments);
    (this as any).mockFn = mockFn; // Expose the mockFn
  }
}
