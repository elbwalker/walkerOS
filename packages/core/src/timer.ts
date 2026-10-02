/**
 * Timer utilities for measuring execution time
 */

export interface Timer {
  start: () => void;
  end: () => number;
  getElapsed: () => number;
  format: () => string;
}

/**
 * Create a high-precision timer
 */
export function createTimer(): Timer {
  let startTime = 0;
  let endTime = 0;

  return {
    start() {
      startTime = Date.now();
      endTime = 0;
    },

    end() {
      endTime = Date.now();
      return endTime - startTime;
    },

    getElapsed() {
      const currentTime = endTime || Date.now();
      return currentTime - startTime;
    },

    format() {
      const elapsed = this.getElapsed();
      return (elapsed / 1000).toFixed(2) + 's';
    },
  };
}
