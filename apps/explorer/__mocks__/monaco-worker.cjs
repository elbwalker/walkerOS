/**
 * Mock for Monaco editor worker modules in Jest tests
 */
module.exports = class MockWorker {
  constructor() {}
  postMessage() {}
  terminate() {}
};
