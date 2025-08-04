/// <reference types="vite/client" />

declare global {
  interface Window {
    elb?: (event: string, data?: any, options?: any) => void;
    walkerjs?: {
      destinations?: Record<string, any>;
    };
  }
}
