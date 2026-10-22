// Setup for testing with Jest and React Testing Library
import '@testing-library/jest-dom';

// Mock window.elb function
(window as { elb?: unknown }).elb = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
globalThis.localStorage = localStorageMock as unknown as Storage;
