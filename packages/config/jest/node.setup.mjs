const mockDataLayer = jest.fn();

global.beforeEach(() => {
  jest.useFakeTimers();

  // Mocks
  jest.clearAllMocks();
  jest.resetModules();
});

global.afterEach(() => {});

export { mockDataLayer };
