import '@testing-library/jest-dom';

declare global {
  interface Window {
    dataLayer: unknown;
  }
}

if (typeof window !== 'undefined') {
  window.dataLayer = [];
}
