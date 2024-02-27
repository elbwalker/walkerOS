import { WebClient } from '..';

const mockDataLayer = jest.fn();

const originalPerformance = global.performance;

global.beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();

  // reset DOM with event listeners etc.
  document.body = document.body.cloneNode() as HTMLElement;

  // DataLayer
  window.dataLayer = [];
  (window.dataLayer as unknown[]).push = mockDataLayer;
  window.elbLayer = undefined as unknown as WebClient.ElbLayer;

  // Performance
  const boundOriginalNow = originalPerformance.now.bind(originalPerformance);
  Object.defineProperty(global, 'performance', {
    value: {
      getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      now: boundOriginalNow,
    },
    writable: true,
    configurable: true,
  });
});

global.afterEach(() => {
  Object.defineProperty(global, 'performance', {
    value: originalPerformance,
    writable: true,
  });
});

export { mockDataLayer };
