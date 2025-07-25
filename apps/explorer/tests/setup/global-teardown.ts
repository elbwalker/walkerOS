import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * Cleanup any resources created during tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  // Cleanup any global resources if needed
  // The webServer will be automatically stopped by Playwright

  console.log('✅ Global teardown complete');
}

export default globalTeardown;
