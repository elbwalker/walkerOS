import { test, expect } from '@playwright/test';

test.describe('walkerOS Explorer Livecode Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to livecode example
    await page.goto('/examples/livecode.html');

    // Wait for the explorer to load
    await page.waitForSelector('[data-testid="livecode-explorer"]', {
      timeout: 10000,
    });
  });

  test('should load livecode example with all components', async ({ page }) => {
    // Check that all main components are present
    await expect(page.locator('[data-testid="code-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="events-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="mapping-panel"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="destination-panel"]'),
    ).toBeVisible();
  });

  test('should detect walker elements automatically', async ({ page }) => {
    // Wait for preview to render
    await page.waitForSelector(
      '[data-testid="preview-container"] button[data-elbaction]',
      { timeout: 10000 },
    );

    // Verify walker elements are present in preview
    const walkerButtons = page.locator(
      '[data-testid="preview-container"] button[data-elbaction]',
    );
    await expect(walkerButtons).toHaveCount(3);

    // Check specific walker attributes
    await expect(
      page.locator('button[data-elbaction="click:view"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[data-elbaction="click:add"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[data-elbaction="click:wishlist"]'),
    ).toBeVisible();
  });

  test('should capture events when clicking walker elements', async ({
    page,
  }) => {
    // Wait for preview to load
    await page.waitForSelector(
      '[data-testid="preview-container"] button[data-elbaction="click:view"]',
      { timeout: 10000 },
    );

    // Click on "View Details" button
    await page.click('button[data-elbaction="click:view"]');

    // Wait for events to be captured and displayed
    await page.waitForTimeout(2000);

    // Check that events panel shows captured events
    const eventsContent = await page
      .locator('[data-testid="events-display"]')
      .textContent();
    expect(eventsContent).toContain('product view');
    expect(eventsContent).toContain('entity');
    expect(eventsContent).toContain('action');
  });

  test('should transform events through mapping', async ({ page }) => {
    // Wait for preview to load
    await page.waitForSelector(
      '[data-testid="preview-container"] button[data-elbaction="click:add"]',
      { timeout: 10000 },
    );

    // Click on "Add to Cart" button
    await page.click('button[data-elbaction="click:add"]');

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check mapping output
    const mappingContent = await page
      .locator('[data-testid="mapping-display"]')
      .textContent();
    expect(mappingContent).toContain('add_to_cart');

    // Check destination calls
    const destinationContent = await page
      .locator('[data-testid="destination-display"]')
      .textContent();
    expect(destinationContent).toContain('gtag');
    expect(destinationContent).toContain('add_to_cart');
  });

  test('should handle multiple event types', async ({ page }) => {
    // Wait for preview to load
    await page.waitForSelector(
      '[data-testid="preview-container"] button[data-elbaction]',
      { timeout: 10000 },
    );

    // Click different buttons in sequence
    await page.click('button[data-elbaction="click:view"]');
    await page.waitForTimeout(500);

    await page.click('button[data-elbaction="click:add"]');
    await page.waitForTimeout(500);

    await page.click('button[data-elbaction="click:wishlist"]');
    await page.waitForTimeout(1000);

    // Check that multiple events are captured
    const eventsContent = await page
      .locator('[data-testid="events-display"]')
      .textContent();
    expect(eventsContent).toContain('product view');
    expect(eventsContent).toContain('product add');
    expect(eventsContent).toContain('product wishlist');

    // Check destination has multiple calls
    const destinationContent = await page
      .locator('[data-testid="destination-display"]')
      .textContent();
    expect(destinationContent).toContain('view_item');
    expect(destinationContent).toContain('add_to_cart');
    expect(destinationContent).toContain('add_to_wishlist');
  });

  test('should update when code is modified', async ({ page }) => {
    // Wait for components to load
    await page.waitForSelector('[data-testid="code-editor"]', {
      timeout: 5000,
    });

    // Click on HTML tab
    await page.click('[data-testid="tab-html"]');

    // Modify the HTML content to add a new button
    const newHTML = `
      <div class="product-demo">
        <h2>Product Demo</h2>
        <button data-elb="product" data-elbaction="click:view" data-elbid="P123" data-elbname="Laptop">
          View Product
        </button>
        <button data-elb="product" data-elbaction="click:add" data-elbid="P123" data-elbname="Laptop">
          Add to Cart
        </button>
        <button data-elbaction="click:custom" data-elb-test="id:T456">
          Test Button
        </button>
      </div>
    `;

    // Clear and type new HTML
    await page.locator('[data-testid="code-editor"] textarea').fill(newHTML);

    // Wait for preview to update
    await page.waitForTimeout(1000);

    // Check that new button appears in preview
    await expect(
      page.locator('button[data-elbaction="click:custom"]'),
    ).toBeVisible();

    // Click the new button
    await page.click('button[data-elbaction="click:custom"]');
    await page.waitForTimeout(500);

    // Verify the new event is captured
    const eventsContent = await page
      .locator('[data-testid="events-display"]')
      .textContent();
    expect(eventsContent).toContain('test custom');
  });

  test('should handle browser source initialization', async ({ page }) => {
    // Check console for browser source initialization logs
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'debug') {
        logs.push(msg.text());
      }
    });

    // Reload page to capture initialization logs
    await page.reload();
    await page.waitForSelector('[data-testid="livecode-explorer"]', {
      timeout: 10000,
    });

    // Wait a bit for all initialization to complete
    await page.waitForTimeout(2000);

    // Check that browser source was initialized
    expect(
      logs.some((log) => log.includes('Browser source initialized')),
    ).toBeTruthy();
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for page to fully load and interact
    await page.waitForSelector(
      '[data-testid="preview-container"] button[data-elbaction]',
      { timeout: 10000 },
    );
    await page.click('button[data-elbaction="click:view"]');
    await page.waitForTimeout(1000);

    // Check that there are no console errors
    expect(errors).toHaveLength(0);
  });

  test('should handle shadow DOM correctly', async ({ page }) => {
    // Verify elements are accessible in shadow DOM
    const shadowHost = page.locator('[data-testid="preview-container"]');
    await expect(shadowHost).toBeVisible();

    // Check that walker elements inside shadow DOM are clickable
    const walkerButton = page.locator('button[data-elbaction="click:view"]');
    await expect(walkerButton).toBeVisible();
    await walkerButton.click();

    // Verify event was captured
    await page.waitForTimeout(500);
    const eventsContent = await page
      .locator('[data-testid="events-display"]')
      .textContent();
    expect(eventsContent).toContain('product view');
  });
});
