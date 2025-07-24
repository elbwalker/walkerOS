// Test setup file for @walkerOS/explorer
import '@testing-library/jest-dom';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveDisplayValue(value: string): R;
      toHaveTextContent(text: string): R;
    }
  }
}

export {};
