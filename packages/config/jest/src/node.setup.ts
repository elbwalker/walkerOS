const mockDataLayer = jest.fn(); //.mockImplementation(console.log);

global.beforeEach(() => {
  jest.useFakeTimers();

  // Mocks
  jest.clearAllMocks();
  jest.resetModules();
});

global.afterEach(() => {});

export { mockDataLayer };
