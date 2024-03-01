const mockDataLayer = jest.fn(); //.mockImplementation(console.log);

global.beforeEach(() => {
  // Mocks
  jest.clearAllMocks();
  jest.resetModules();

  // reset DOM with event listeners etc.
  document.getElementsByTagName('html')[0].innerHTML = '';
  document.body = document.body.cloneNode() as HTMLElement;

  // elbLayer and dataLayer
  const w = window as unknown as Record<string, unknown | unknown[]>;
  w.elbLayer = undefined;
  w.dataLayer = [];
  (w.dataLayer as unknown[]).push = mockDataLayer;

  // Performance
  global.performance.getEntriesByType = jest
    .fn()
    .mockReturnValue([{ type: 'navigate' }]);
});

global.afterEach(() => {});

export { mockDataLayer };
