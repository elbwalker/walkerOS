import { test, expect } from '@playwright/test';

/**
 * Visual tests for LiveCode component layouts and configurations
 * These tests ensure visual consistency and catch layout regressions
 */

test.describe('LiveCode Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to consistent size for screenshots
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('Original test-clean-layout.html renders correctly', async ({
    page,
  }) => {
    await page.goto('/test-clean-layout.html');

    // Wait for the component to load and execute
    await page.waitForSelector('#clean-livecode', { timeout: 10000 });
    await page.waitForFunction(
      () => {
        const status = document.getElementById('status');
        return (
          status &&
          status.textContent &&
          (status.textContent.includes('successfully') ||
            status.textContent.includes('Error'))
        );
      },
      { timeout: 15000 },
    );

    // Take screenshot of the full page
    await expect(page).toHaveScreenshot('original-clean-layout.png');

    // Take screenshot of just the LiveCode component
    const liveCodeElement = page.locator('#clean-livecode');
    await expect(liveCodeElement).toHaveScreenshot(
      'original-livecode-component.png',
    );

    // Check that the component loaded without errors
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toMatch(/(successfully|loaded)/i);
  });

  test('Improved test layout with multiple configurations', async ({
    page,
  }) => {
    await page.goto('/test-clean-layout-improved.html');

    // Wait for all components to load
    await page.waitForSelector('#test1-container', { timeout: 10000 });
    await page.waitForFunction(
      () => {
        const mainStatus = document.getElementById('main-status');
        return (
          mainStatus &&
          mainStatus.textContent &&
          mainStatus.textContent.includes('successfully')
        );
      },
      { timeout: 15000 },
    );

    // Wait a bit for all components to render
    await page.waitForTimeout(2000);

    // Take screenshot of the full page
    await expect(page).toHaveScreenshot('improved-layout-full.png');

    // Test individual configurations
    const testConfigs = [
      { id: 'test1', name: 'clean-2panel' },
      { id: 'test2', name: 'minimal' },
      { id: 'test3', name: 'input-only' },
    ];

    for (const config of testConfigs) {
      const container = page.locator(`#${config.id}-container`);
      await expect(container).toHaveScreenshot(`${config.name}-config.png`);

      // Check status
      const statusElement = page.locator(`#${config.id}-status`);
      const statusText = await statusElement.textContent();
      expect(statusText).toMatch(/(successfully|created|executed)/i);
    }

    // Test debug information
    const debugSection = page.locator('.debug-info');
    await expect(debugSection).toHaveScreenshot('debug-info-section.png');
  });

  test('LiveCode responsive behavior', async ({ page }) => {
    await page.goto('/test-clean-layout-improved.html');

    // Wait for components to load
    await page.waitForFunction(
      () => {
        const mainStatus = document.getElementById('main-status');
        return (
          mainStatus &&
          mainStatus.textContent &&
          mainStatus.textContent.includes('successfully')
        );
      },
      { timeout: 15000 },
    );

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500); // Let layout settle

      await expect(page).toHaveScreenshot(`responsive-${viewport.name}.png`);
    }
  });

  test('Theme and styling consistency', async ({ page }) => {
    await page.goto('/test-clean-layout-improved.html');

    // Wait for components to load
    await page.waitForFunction(
      () => {
        const mainStatus = document.getElementById('main-status');
        return (
          mainStatus &&
          mainStatus.textContent &&
          mainStatus.textContent.includes('successfully')
        );
      },
      { timeout: 15000 },
    );

    // Test different states
    await page.waitForTimeout(1000);

    // Screenshot of success state
    await expect(page).toHaveScreenshot('theme-success-state.png');

    // Test hover states on interactive elements
    const firstContainer = page.locator('#test1-container');
    await firstContainer.hover();
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('theme-hover-state.png');

    // Test focus states
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('theme-focus-state.png');
  });

  test('Code execution and output display', async ({ page }) => {
    await page.goto('/test-clean-layout-improved.html');

    // Wait for components to load and execute
    await page.waitForFunction(
      () => {
        const mainStatus = document.getElementById('main-status');
        return (
          mainStatus &&
          mainStatus.textContent &&
          mainStatus.textContent.includes('successfully')
        );
      },
      { timeout: 15000 },
    );

    // Wait for code execution to complete
    await page.waitForTimeout(3000);

    // Take screenshot showing executed code and results
    await expect(page).toHaveScreenshot('code-execution-results.png');

    // Test each configuration's output
    const testContainers = [
      '#test1-container',
      '#test2-container',
      '#test3-container',
    ];

    for (let i = 0; i < testContainers.length; i++) {
      const container = page.locator(testContainers[i]);
      await expect(container).toHaveScreenshot(
        `execution-output-test${i + 1}.png`,
      );
    }
  });

  test('Component loading states', async ({ page }) => {
    // Start navigation but don't wait for full load
    const response = page.goto('/test-clean-layout-improved.html');

    // Capture loading state
    await page.waitForSelector('.test-container', { timeout: 5000 });
    await expect(page).toHaveScreenshot('loading-state.png');

    // Wait for complete load
    await response;
    await page.waitForFunction(
      () => {
        const mainStatus = document.getElementById('main-status');
        return (
          mainStatus &&
          mainStatus.textContent &&
          mainStatus.textContent.includes('successfully')
        );
      },
      { timeout: 15000 },
    );

    // Capture fully loaded state
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('loaded-state.png');
  });

  test('Error handling and display', async ({ page }) => {
    // Create a custom test page with intentional errors
    const errorPageContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .error-test { height: 400px; border: 1px solid #ccc; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Error Handling Test</h1>
        <div id="error-test" class="error-test"></div>
        <div id="status">Testing error handling...</div>
    </div>

    <script src="./dist/explorer.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            try {
                // Create LiveCode with invalid configuration to trigger error
                const liveCode = new WalkerOSExplorer.LiveCode(document.getElementById('error-test'), {
                    input: 'throw new Error("Test error for visual testing");',
                    showConfig: false,
                    showOutput: true,
                    height: '380px',
                    fn: async (code) => {
                        // Execute the error-throwing code
                        return eval(code);
                    },
                    onError: (error) => {
                        document.getElementById('status').textContent = 'Error captured: ' + error.message;
                        document.getElementById('status').style.color = '#dc2626';
                    }
                });
            } catch (error) {
                document.getElementById('status').textContent = 'Component error: ' + error.message;
                document.getElementById('status').style.color = '#dc2626';
                console.error('Error:', error);
            }
        });
    </script>
</body>
</html>`;

    // Set up the error test page
    await page.route('/error-test.html', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: errorPageContent,
      });
    });

    await page.goto('/error-test.html');

    // Wait for error to be displayed
    await page.waitForFunction(
      () => {
        const status = document.getElementById('status');
        return (
          status &&
          status.textContent &&
          (status.textContent.includes('Error') ||
            status.textContent.includes('error'))
        );
      },
      { timeout: 10000 },
    );

    await page.waitForTimeout(1000);

    // Take screenshot of error state
    await expect(page).toHaveScreenshot('error-handling-display.png');
  });
});
