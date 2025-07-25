import { Page } from '@playwright/test';

/**
 * Test utilities for visual testing of the Explorer components
 */

export class ExplorerTestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for LiveCode component to be fully loaded and ready
   */
  async waitForLiveCodeReady(
    selector: string = '#clean-livecode',
    timeout = 15000,
  ) {
    await this.page.waitForSelector(selector, { timeout });

    // Wait for any JavaScript initialization
    await this.page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        if (!element) return false;

        // Check if the component has rendered content
        const hasContent = element.children.length > 0;
        const hasStyles = window.getComputedStyle(element).display !== 'none';

        return hasContent && hasStyles;
      },
      selector,
      { timeout },
    );
  }

  /**
   * Wait for component execution to complete
   */
  async waitForExecution(statusSelector: string = '#status', timeout = 10000) {
    await this.page.waitForFunction(
      (sel) => {
        const status = document.querySelector(sel);
        if (!status || !status.textContent) return false;

        const text = status.textContent.toLowerCase();
        return (
          text.includes('successfully') ||
          text.includes('error') ||
          text.includes('completed') ||
          text.includes('executed')
        );
      },
      statusSelector,
      { timeout },
    );
  }

  /**
   * Get the current state of all test components
   */
  async getComponentStates() {
    return await this.page.evaluate(() => {
      const states: Record<string, any> = {};

      // Check main status
      const mainStatus = document.getElementById('main-status');
      if (mainStatus) {
        states.mainStatus = {
          text: mainStatus.textContent,
          className: mainStatus.className,
        };
      }

      // Check test component statuses
      ['test1', 'test2', 'test3'].forEach((testId) => {
        const statusEl = document.getElementById(`${testId}-status`);
        const containerEl = document.getElementById(`${testId}-container`);

        if (statusEl && containerEl) {
          states[testId] = {
            status: statusEl.textContent,
            statusClass: statusEl.className,
            hasContent: containerEl.children.length > 0,
            containerVisible:
              window.getComputedStyle(containerEl).display !== 'none',
          };
        }
      });

      return states;
    });
  }

  /**
   * Inject custom CSS for testing specific states
   */
  async injectTestStyles(css: string) {
    await this.page.addStyleTag({ content: css });
  }

  /**
   * Simulate component interactions
   */
  async simulateCodeExecution(containerId: string, code: string) {
    await this.page.evaluate(
      ({ containerId, code }) => {
        // Find the component within the container and update its input
        const container = document.getElementById(containerId);
        if (container) {
          // This is a simplified simulation - in real usage you'd interact with the actual component API
          const codeElement = container.querySelector('textarea, .code-input');
          if (codeElement) {
            (codeElement as HTMLTextAreaElement).value = code;
            // Trigger change event
            codeElement.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      },
      { containerId, code },
    );
  }

  /**
   * Take a screenshot of a specific component with consistent styling
   */
  async screenshotComponent(selector: string, name: string) {
    const element = this.page.locator(selector);

    // Ensure element is visible and ready
    await element.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(500); // Let animations settle

    return await element.screenshot({
      path: `test-results/screenshots/${name}.png`,
      animations: 'disabled',
    });
  }

  /**
   * Check for console errors during test execution
   */
  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];

    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    this.page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    return errors;
  }

  /**
   * Mock the getMappingValue function for consistent testing
   */
  async setupMockFunctions() {
    await this.page.addInitScript(() => {
      // Mock functions that might be used in test code
      (window as any).getMappingValue = async (obj: any, path: string) => {
        const keys = path.split('.');
        let result = obj;
        for (const key of keys) {
          result = result?.[key];
        }
        return result;
      };

      // Add test utilities to window for debugging
      (window as any).testUtils = {
        getComponentState: (id: string) => {
          const element = document.getElementById(id);
          return {
            exists: !!element,
            visible: element
              ? window.getComputedStyle(element).display !== 'none'
              : false,
            hasContent: element ? element.children.length > 0 : false,
          };
        },
      };
    });
  }

  /**
   * Wait for all fonts to load to ensure consistent text rendering
   */
  async waitForFonts() {
    await this.page.evaluate(async () => {
      if ('fonts' in document) {
        await (document as any).fonts.ready;
      }
    });
  }

  /**
   * Disable animations for consistent screenshots
   */
  async disableAnimations() {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  }

  /**
   * Set up page for consistent visual testing
   */
  async setupForVisualTesting() {
    // Set consistent viewport
    await this.page.setViewportSize({ width: 1200, height: 800 });

    // Wait for fonts
    await this.waitForFonts();

    // Disable animations
    await this.disableAnimations();

    // Setup mock functions
    await this.setupMockFunctions();

    // Start collecting console errors
    await this.getConsoleErrors();
  }
}

/**
 * Create test helpers for a page
 */
export function createTestHelpers(page: Page): ExplorerTestHelpers {
  return new ExplorerTestHelpers(page);
}
