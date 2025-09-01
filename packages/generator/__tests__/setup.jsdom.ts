// JSDOM setup for runtime testing
import 'jest';

// Global test state for captured logs (when needed)
declare global {
  var capturedLogs: string[];
  var capturedErrors: string[];
}

beforeEach(() => {
  // Reset captured logs
  global.capturedLogs = [];
  global.capturedErrors = [];

  // Mock console methods to capture output silently
  console.log = jest.fn((...args) => {
    global.capturedLogs.push(args.map(String).join(' '));
    // Don't call original - suppress output
  });

  console.error = jest.fn((...args) => {
    global.capturedErrors.push(args.map(String).join(' '));
    // Don't call original - suppress output
  });

  console.warn = jest.fn();

  // Reset document
  document.body.innerHTML = '';
  document.head.innerHTML =
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">';
});

afterEach(() => {
  // Clean up any global state
  delete (window as any).walkerOS;
  delete (window as any).elb;
  delete (window as any).elbLayer;
  delete (window as any).gtag;
});

// Add helpful matchers
expect.extend({
  toHaveBeenCalledWithEvent(received: jest.Mock, event: string) {
    const calls = received.mock.calls;
    const found = calls.some(
      (call) =>
        call[0] && typeof call[0] === 'string' && call[0].includes(event),
    );

    return {
      message: () =>
        `Expected ${received.getMockName()} to have been called with event "${event}"`,
      pass: found,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWithEvent(event: string): R;
    }
  }
}
