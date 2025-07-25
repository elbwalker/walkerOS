# Visual Testing Guide for WalkerOS Explorer

This guide explains how to use the visual testing infrastructure for the
WalkerOS Explorer application.

## Overview

The visual testing setup provides automated screenshot-based regression testing
for the Explorer components, particularly the LiveCode layouts. It includes:

- **Playwright-based visual testing** with cross-browser support
- **Automated test harness** for build and test automation
- **Development workflow** with file watching and live updates
- **Multiple test configurations** to cover different component states

## Quick Start

### 1. Run Visual Tests Once

```bash
npm run test:playwright
```

### 2. Start Development Workflow with Live Updates

```bash
npm run dev:visual
```

### 3. View Test Results

```bash
npm run test:playwright:report
```

## Available Scripts

### Basic Testing

- `npm run test:playwright` - Run all visual tests
- `npm run test:playwright:ui` - Run tests with interactive UI
- `npm run test:playwright:debug` - Run tests in debug mode
- `npm run test:playwright:report` - View HTML test report

### Development Workflow

- `npm run dev:visual` - Start development workflow with file watching
- `npm run dev:visual:once` - Run full cycle once without watching

### Legacy Test Harness

- `npm run test:visual` - Run basic HTML test harness
- `npm run test:visual:watch` - Watch mode for basic test harness

## Test Structure

### Visual Test Files

```
tests/
├── visual/
│   └── livecode-layouts.spec.ts    # Main visual test suite
├── setup/
│   ├── global-setup.ts             # Test environment setup
│   └── global-teardown.ts          # Test cleanup
└── utils/
    └── test-helpers.ts              # Testing utilities
```

### Test Coverage

The visual tests cover:

1. **Original Layout Test** (`test-clean-layout.html`)
   - Basic 2-panel LiveCode layout
   - Component loading and execution
   - Error handling

2. **Improved Layout Test** (`test-clean-layout-improved.html`)
   - Multiple configuration variations
   - Debug information display
   - Status indicators

3. **Responsive Behavior**
   - Desktop, tablet, and mobile viewports
   - Layout adaptation testing

4. **Theme and Styling**
   - Light/dark theme consistency
   - Hover and focus states
   - Visual state transitions

5. **Code Execution**
   - Input processing
   - Output display
   - Error state rendering

6. **Loading States**
   - Component initialization
   - Progressive loading
   - Error recovery

## Configuration

### Playwright Configuration

The main configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests/visual',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run demo',
    url: 'http://localhost:3002',
  },
});
```

### Development Workflow Configuration

Create `dev-workflow.config.js` to customize the development workflow:

```javascript
module.exports = {
  serverPort: 3002,
  watchPaths: ['src/**/*.ts', 'test-*.html', 'tests/**/*.ts'],
  testCommand:
    'npx playwright test --project=chromium tests/visual/livecode-layouts.spec.ts',
  buildCommand: 'npm run build',
};
```

## Writing Visual Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('component renders correctly', async ({ page }) => {
    await page.goto('/test-page.html');

    // Wait for component to load
    await page.waitForSelector('#component-container');

    // Take screenshot
    await expect(page).toHaveScreenshot('component-state.png');
  });
});
```

### Using Test Helpers

```typescript
import { createTestHelpers } from '../utils/test-helpers';

test('component with helpers', async ({ page }) => {
  const helpers = createTestHelpers(page);

  await helpers.setupForVisualTesting();
  await page.goto('/test-page.html');
  await helpers.waitForLiveCodeReady('#component');

  await expect(page).toHaveScreenshot('component.png');
});
```

## Best Practices

### 1. Consistent Screenshots

- Use consistent viewport sizes
- Disable animations for stable screenshots
- Wait for fonts to load
- Handle loading states properly

### 2. Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Organize screenshots with clear naming

### 3. Maintenance

- Update baseline screenshots when layouts change intentionally
- Review visual diffs carefully
- Test across different browsers and devices

## Troubleshooting

### Common Issues

1. **Screenshots Don't Match**

   ```bash
   # Update baselines when changes are intentional
   npx playwright test --update-snapshots
   ```

2. **Server Not Starting**

   ```bash
   # Kill existing server processes
   lsof -ti:3002 | xargs kill -9
   ```

3. **Font Rendering Differences**
   - Ensure fonts are loaded before taking screenshots
   - Use web-safe fonts for consistent rendering
   - Consider font-display: swap for better loading

### Debug Mode

```bash
# Run tests with browser UI for debugging
npm run test:playwright:debug

# Run with interactive mode
npm run test:playwright:ui
```

### View Test Results

The HTML report provides detailed information about test failures:

```bash
npm run test:playwright:report
```

## File Structure

```
apps/explorer/
├── tests/
│   ├── visual/
│   │   └── livecode-layouts.spec.ts
│   ├── setup/
│   │   ├── global-setup.ts
│   │   └── global-teardown.ts
│   └── utils/
│       └── test-helpers.ts
├── test-clean-layout.html                # Original test file
├── test-clean-layout-improved.html       # Enhanced test file
├── test-harness.js                       # Basic test automation
├── dev-workflow.js                       # Development workflow
├── playwright.config.ts                  # Playwright configuration
└── VISUAL_TESTING.md                     # This guide
```

## Integration with CI/CD

To integrate with continuous integration:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run visual tests
  run: npm run test:playwright

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: test-results/html-report/
```

## Performance Considerations

- Tests run in parallel by default
- Use `--project=chromium` for faster feedback during development
- Consider running full cross-browser tests only in CI

## Contributing

When adding new visual tests:

1. Follow the existing test structure
2. Use descriptive names for screenshots
3. Add appropriate waits for dynamic content
4. Test both success and error states
5. Update this documentation as needed

## Support

For issues with visual testing:

1. Check the Playwright documentation
2. Review test output and screenshots
3. Use debug mode to inspect test behavior
4. Consult the team for complex visual regression issues
