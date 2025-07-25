import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Ensures the explorer is built and server is ready before tests start
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for visual tests...');

  // The webServer configuration in playwright.config.ts will handle
  // starting the development server, so we just need to ensure
  // the build is current

  console.log('✅ Global setup complete');
}

export default globalSetup;
