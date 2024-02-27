import { WebClient } from '..';

const mockDataLayer = jest.fn(); //.mockImplementation(console.log);

let originalPerformance: Performance;

global.beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  jest.useFakeTimers();

  // reset DOM with event listeners etc.
  document.body = document.body.cloneNode() as HTMLElement;

  // DataLayer
  window.dataLayer = [];
  (window.dataLayer as unknown[]).push = mockDataLayer;
  window.elbLayer = undefined as unknown as WebClient.ElbLayer;

  // Performance
  originalPerformance = global.performance;
  Object.defineProperty(global, 'performance', {
    value: {
      ...originalPerformance,
      getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
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

  document.getElementsByTagName('html')[0].innerHTML = '';
});

export { mockDataLayer };
