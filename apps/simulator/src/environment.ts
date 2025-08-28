/**
 * Browser environment mocks for walkerOS web destinations in Node.js
 *
 * This module provides comprehensive browser API mocks that web destinations
 * require to function properly in a Node.js environment like our simulator.
 */

// Mock HTML script element
interface MockHTMLScriptElement {
  src: string;
  async: boolean;
  [key: string]: unknown;
}

// Mock HTML head element
interface MockHTMLHeadElement {
  appendChild: (element: MockHTMLScriptElement) => void;
}

// Mock document object
interface MockDocument {
  createElement: (tagName: string) => MockHTMLScriptElement;
  head: MockHTMLHeadElement;
}

// Mock window object with destination-specific APIs
interface MockWindow {
  // Google Analytics (gtag destination)
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];

  // Facebook Pixel (meta destination)
  fbq?: (...args: unknown[]) => void;
  _fbq?: (...args: unknown[]) => void;

  // Plausible Analytics
  plausible?: (...args: unknown[]) => void;

  // PiwikPro Analytics
  _paq?: unknown[];

  // Generic analytics function placeholder
  [key: string]: unknown;
}

/**
 * Sets up comprehensive browser environment mocks for walkerOS destinations
 *
 * This function creates all the browser APIs that walkerOS web destinations
 * expect to find in a browser environment. The mocked functions are designed
 * to work with the walkerOS wrapper system to capture calls without failing.
 */
export function setupBrowserEnvironment(): void {
  // Only set up if not already done
  if ((global as any).__walkerOS_browser_mocked) return;

  // Mock document object
  const mockDocument: MockDocument = {
    createElement: (tagName: string): MockHTMLScriptElement => ({
      src: '',
      async: false,
    }),
    head: {
      appendChild: (element: MockHTMLScriptElement): void => {
        // Script loading mock - does nothing but doesn't fail
      },
    },
  };

  // Mock window object with destination APIs
  const mockWindow: MockWindow = {
    // Google Analytics gtag function
    gtag: function (...args: unknown[]): void {
      // This will be wrapped by walkerOS wrapper system for capture
      // The actual implementation doesn't matter since wrapper intercepts
    },

    // Google Analytics data layer
    dataLayer: [],

    // Facebook Pixel fbq function
    fbq: function (...args: unknown[]): void {
      // This will be wrapped by walkerOS wrapper system for capture
    },

    // Plausible analytics function
    plausible: function (...args: unknown[]): void {
      // This will be wrapped by walkerOS wrapper system for capture
    },

    // PiwikPro data array
    _paq: [],
  };

  // Set global mocks
  (global as any).window = mockWindow;
  (global as any).document = mockDocument;

  // Mark as mocked to prevent duplicate setup
  (global as any).__walkerOS_browser_mocked = true;
}

/**
 * Resets the browser environment mocks
 * Useful for testing or cleanup
 */
export function resetBrowserEnvironment(): void {
  delete (global as any).window;
  delete (global as any).document;
  delete (global as any).__walkerOS_browser_mocked;
}
