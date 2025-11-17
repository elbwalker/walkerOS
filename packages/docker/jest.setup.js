/**
 * Jest setup for integration tests
 * Node 18+ has fetch built-in, no need to polyfill
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clean up any hanging processes after all tests
afterAll(async () => {
  // Give processes time to clean up
  await new Promise((resolve) => setTimeout(resolve, 1000));
});
