/**
 * Standardized test selectors for Playwright testing
 * Provides consistent selectors for UI components
 */

export const selectors = {
  // Tab buttons in code editor
  tabs: {
    html: '[data-testid="tab-html"]',
    css: '[data-testid="tab-css"]',
    js: '[data-testid="tab-js"]',
    active: '.elb-button--tab.elb-button--active',
    group: '.elb-tab-group',
  },

  // General buttons
  buttons: {
    copy: '[data-testid="btn-copy"]',
    format: '[data-testid="btn-format"]',
    primary: '.elb-button--primary',
    secondary: '.elb-button--secondary',
    ghost: '.elb-button--ghost',
    tab: '.elb-button--tab',
  },

  // Panel components
  panels: {
    codeEditor: '[data-testid="code-editor"]',
    preview: '[data-testid="preview-panel"]',
    events: '[data-testid="events-panel"]',
    mapping: '[data-testid="mapping-panel"]',
    destination: '[data-testid="destination-panel"]',
  },

  // Content areas
  content: {
    previewContainer: '[data-testid="preview-container"]',
    eventsDisplay: '[data-testid="events-display"]',
    mappingDisplay: '[data-testid="mapping-display"]',
    destinationDisplay: '[data-testid="destination-display"]',
  },

  // Livecode example
  livecode: {
    root: '[data-testid="livecode-explorer"]',
    productButtons: '.product button[data-elbaction]',
    viewDetailsButton: 'button[data-elbaction="click:view"]',
    addToCartButton: 'button[data-elbaction="click:add"]',
    wishlistButton: 'button[data-elbaction="click:wishlist"]',
  },
};

/**
 * Helper functions for common test operations
 */
export const testHelpers = {
  /**
   * Get selector for a specific tab
   */
  getTabSelector: (tab: 'html' | 'css' | 'js') => selectors.tabs[tab],

  /**
   * Get selector for active tab
   */
  getActiveTabSelector: () => selectors.tabs.active,

  /**
   * Get selector for a specific panel
   */
  getPanelSelector: (
    panel: 'codeEditor' | 'preview' | 'events' | 'mapping' | 'destination',
  ) => selectors.panels[panel],

  /**
   * Wait for tab to be visible and clickable
   */
  waitForTab: (page: any, tab: 'html' | 'css' | 'js') =>
    page.waitForSelector(selectors.tabs[tab], { state: 'visible' }),

  /**
   * Click a specific tab
   */
  clickTab: async (page: any, tab: 'html' | 'css' | 'js') => {
    const selector = selectors.tabs[tab];
    await page.waitForSelector(selector, { state: 'visible' });
    await page.click(selector);
  },

  /**
   * Verify tab is active
   */
  verifyTabActive: (page: any, tab: 'html' | 'css' | 'js') =>
    page.waitForSelector(`${selectors.tabs[tab]}.elb-button--active`, {
      state: 'visible',
    }),

  /**
   * Get text content from a content area
   */
  getContentText: (
    page: any,
    area: 'eventsDisplay' | 'mappingDisplay' | 'destinationDisplay',
  ) => page.textContent(selectors.content[area]),
};

export default selectors;
