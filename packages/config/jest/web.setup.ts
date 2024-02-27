const mockDataLayer = jest.fn(); //.mockImplementation(console.log);

// let originalPerformance: Performance;

global.beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();

  // reset DOM with event listeners etc.
  document.getElementsByTagName('html')[0].innerHTML = '';
  document.body = document.body.cloneNode() as HTMLElement;

  // elbLayer and dataLayer
  window.elbLayer = undefined;
  window.dataLayer = [];
  (window.dataLayer as unknown[]).push = mockDataLayer;

  // Performance
  // const originalPerformance = global.performance;
  // Object.defineProperty(global, 'performance', {
  //   // value: {
  //   //   ...originalPerformance,
  //   //   getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
  //   // },
  //   writable: true,
  //   configurable: true,
  // });
  global.performance.getEntriesByType = jest
    .fn()
    .mockReturnValue([{ type: 'navigate' }]);
});

global.afterEach(() => {
  // Object.defineProperty(global, 'performance', {
  //   value: originalPerformance,
  //   writable: true,
  // });
});

export { mockDataLayer };
