import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  // Output directory for test artifacts
  outputDir: './test-results',
  // Global setup / teardown
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: './test-results/html-report' }],
    ['json', { outputFile: './test-results/test-results.json' }],
    ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3002',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording */
    video: 'retain-on-failure',
  },

  /* Configure projects for different test types */
  projects: [
    // Functional tests - fast, no visual testing
    {
      name: 'functional',
      testDir: './tests/functional',
      use: {
        ...devices['Desktop Chrome'],
        // Faster execution for functional tests
        actionTimeout: 10000,
        navigationTimeout: 30000,
      },
    },

    // Visual tests - comprehensive browser coverage
    {
      name: 'visual-chromium',
      testDir: './tests/visual',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual-firefox',
      testDir: './tests/visual',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'visual-webkit',
      testDir: './tests/visual',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile visual tests */
    {
      name: 'visual-mobile-chrome',
      testDir: './tests/visual',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'visual-mobile-safari',
      testDir: './tests/visual',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run demo',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Visual testing specific settings */
  expect: {
    // Threshold for visual comparisons (0-1, where 0 is identical)
    toHaveScreenshot: {
      threshold: 0.2,
      // Animation handling
      animations: 'disabled',
    },
    toMatchScreenshot: {
      threshold: 0.2,
      animations: 'disabled',
    },
  },
});
