/// <reference types="vite/client" />

declare global {
  interface Window {
    elb?: (event: string, data?: unknown, options?: unknown) => void;
    walkerjs?: {
      destinations?: Record<string, unknown>;
    };
  }
}
