const mockDataLayer = jest.fn();

global.beforeEach(() => {
  jest.clearAllMocks();
});

global.afterEach(() => {});

export { mockDataLayer };
