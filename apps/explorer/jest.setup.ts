import '@testing-library/jest-dom';

// Mock navigator.clipboard for copy functionality tests
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});
