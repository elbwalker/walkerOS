import '@testing-library/jest-dom';

const mockDataLayer = jest.fn();

global.beforeEach(() => {
  jest.useFakeTimers();

  // Mocks
  jest.clearAllMocks();
  jest.resetModules();

  // reset DOM with event listeners etc.
  document.getElementsByTagName('html')[0].innerHTML = '';
  document.body = document.body.cloneNode();

  // elbLayer and dataLayer
  const w = window;
  w.elbLayer = undefined;
  w.dataLayer = [];
  w.dataLayer.push = mockDataLayer;

  // Performance
  global.performance.getEntriesByType = jest
    .fn()
    .mockReturnValue([{ type: 'navigate' }]);
});

global.afterEach(() => {});

export { mockDataLayer };
