/**
 * Destination Component - Test and debug walkerOS destinations
 *
 * Features:
 * - Destination configuration editor
 * - Real-time testing interface
 * - Event simulation and validation
 * - Configuration templates
 * - Export/import functionality
 * - Performance monitoring
 */

import { createComponent, type ComponentAPI } from '../core/Component';
import { createCodeEditor, type CodeEditorAPI } from './CodeEditor';
import { createResultDisplay, type ResultDisplayAPI } from './ResultDisplay';
import { createElement, addEventListener, injectCSS } from '../utils/dom';
import { debounce } from '../utils/debounce';
import type { WalkerEvent } from './EventFlow';

export interface DestinationConfig {
  name: string;
  id: string;
  config: Record<string, unknown>;
  init?: string; // JavaScript code for initialization
  push?: string; // JavaScript code for push function
  custom?: Record<string, unknown>;
}

export interface DestinationOptions {
  initialConfig?: DestinationConfig;
  showTemplates?: boolean;
  showTesting?: boolean;
  enableValidation?: boolean;
  height?: string;
  onConfigChange?: (config: DestinationConfig) => void;
  onTest?: (config: DestinationConfig, event: WalkerEvent) => void;
  onValidate?: (config: DestinationConfig) => ValidationResult[];
}

export interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  code?: string;
}

export interface DestinationAPI extends ComponentAPI {
  getConfig(): DestinationConfig;
  setConfig(config: DestinationConfig): void;
  testDestination(event: WalkerEvent): Promise<unknown>;
  validateConfig(): ValidationResult[];
  exportConfig(): string;
  importConfig(json: string): boolean;
  loadTemplate(templateName: string): void;
  getAvailableTemplates(): string[];
}

/**
 * Common destination templates
 */
const DESTINATION_TEMPLATES: Record<string, DestinationConfig> = {
  'Google Analytics 4': {
    name: 'Google Analytics 4',
    id: 'ga4',
    config: {
      measurementId: 'G-XXXXXXXXXX',
      apiSecret: '',
      customParameters: {},
    },
    init: `// GA4 Destination Initialization
const { measurementId, apiSecret } = config;

if (!measurementId) {
  throw new Error('Measurement ID is required');
}

// Initialize gtag if not present
if (!window.gtag) {
  const script = document.createElement('script');
  script.async = true;
  script.src = \`https://www.googletagmanager.com/gtag/js?id=\${measurementId}\`;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    dataLayer.push(arguments);
  };
}

gtag('config', measurementId);

return { measurementId, apiSecret };`,
    push: `// GA4 Event Push
const { event, data, context, globals, user } = eventData;
const { measurementId } = destinationConfig;

// Map walkerOS event to GA4 format
const ga4Event = {
  event_name: event.replace(' ', '_'),
  ...data,
  // Add custom parameters
  walker_timestamp: new Date().toISOString(),
  walker_source: 'walkeros'
};

// Send to GA4
gtag('event', ga4Event.event_name, ga4Event);

return { sent: true, event: ga4Event };`,
  },

  'Facebook Pixel': {
    name: 'Facebook Pixel',
    id: 'facebook',
    config: {
      pixelId: '',
      accessToken: '',
      testEventCode: '',
    },
    init: `// Facebook Pixel Initialization
const { pixelId } = config;

if (!pixelId) {
  throw new Error('Pixel ID is required');
}

// Initialize Facebook Pixel
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', pixelId);
fbq('track', 'PageView');

return { pixelId };`,
    push: `// Facebook Pixel Event Push
const { event, data } = eventData;
const { pixelId } = destinationConfig;

// Map walkerOS event to Facebook format
let fbEvent = event;
let fbData = { ...data };

// Convert common events
switch (event) {
  case 'page view':
    fbEvent = 'PageView';
    break;
  case 'product click':
    fbEvent = 'ViewContent';
    break;
  case 'order complete':
    fbEvent = 'Purchase';
    break;
  default:
    fbEvent = 'CustomEvent';
    fbData.event_name = event;
}

// Send to Facebook
fbq('track', fbEvent, fbData);

return { sent: true, event: fbEvent, data: fbData };`,
  },

  'Custom API': {
    name: 'Custom API',
    id: 'custom_api',
    config: {
      endpoint: 'https://api.example.com/events',
      apiKey: '',
      headers: {},
      method: 'POST',
    },
    init: `// Custom API Destination Initialization
const { endpoint, apiKey } = config;

if (!endpoint) {
  throw new Error('API endpoint is required');
}

// Validate endpoint
try {
  new URL(endpoint);
} catch (e) {
  throw new Error('Invalid API endpoint URL');
}

return { endpoint, apiKey, ready: true };`,
    push: `// Custom API Event Push
const { event, data, context, globals, user } = eventData;
const { endpoint, apiKey, headers, method } = destinationConfig;

const payload = {
  event,
  data,
  context,
  globals,
  user,
  timestamp: new Date().toISOString(),
  source: 'walkeros'
};

const requestHeaders = {
  'Content-Type': 'application/json',
  ...headers
};

if (apiKey) {
  requestHeaders['Authorization'] = \`Bearer \${apiKey}\`;
}

// Send to API
return fetch(endpoint, {
  method: method || 'POST',
  headers: requestHeaders,
  body: JSON.stringify(payload)
})
.then(response => ({
  sent: true,
  status: response.status,
  ok: response.ok
}))
.catch(error => ({
  sent: false,
  error: error.message
}));`,
  },

  'Console Logger': {
    name: 'Console Logger',
    id: 'console',
    config: {
      logLevel: 'info',
      includeTimestamp: true,
      formatJson: true,
    },
    init: `// Console Logger Initialization
const { logLevel, includeTimestamp, formatJson } = config;

const logLevels = ['error', 'warn', 'info', 'debug'];
const selectedLevel = logLevels.indexOf(logLevel) || 2;

return { 
  logLevel: selectedLevel,
  includeTimestamp,
  formatJson,
  ready: true 
};`,
    push: `// Console Logger Event Push
const { event, data, context, globals, user } = eventData;
const { logLevel, includeTimestamp, formatJson } = destinationConfig;

let logData = { event, data, context, globals, user };

if (includeTimestamp) {
  logData.timestamp = new Date().toISOString();
}

const output = formatJson ? 
  JSON.stringify(logData, null, 2) : 
  logData;

// Log based on level
switch (logLevel) {
  case 0: console.error('[WalkerOS]', output); break;
  case 1: console.warn('[WalkerOS]', output); break;
  case 2: console.info('[WalkerOS]', output); break;
  case 3: console.debug('[WalkerOS]', output); break;
  default: console.log('[WalkerOS]', output);
}

return { sent: true, logLevel, output };`,
  },
};

/**
 * Create a Destination component
 */
export function createDestination(
  elementOrSelector: HTMLElement | string,
  options: DestinationOptions = {},
): DestinationAPI {
  const baseComponent = createComponent(elementOrSelector, {
    autoMount: false,
  });

  const element = baseComponent.getElement()!;
  element.classList.add('explorer-destination');

  // Component state
  let currentConfig: DestinationConfig = options.initialConfig || {
    name: 'New Destination',
    id: 'custom',
    config: {},
    init: '// Initialization code\nreturn { ready: true };',
    push: '// Event push code\nconst { event, data } = eventData;\nreturn { sent: true, event, data };',
  };

  let configEditor: CodeEditorAPI;
  let initEditor: CodeEditorAPI;
  let pushEditor: CodeEditorAPI;
  let resultsDisplay: ResultDisplayAPI;
  let activeTab: 'config' | 'init' | 'push' | 'test' = 'config';

  // Cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  // Debounced config update
  const debouncedConfigUpdate = debounce(() => {
    updateConfig();
    validateCurrentConfig();
  }, 500);

  /**
   * Inject Destination CSS styles
   */
  function injectStyles(): void {
    const css = `
/* Destination Component Styles */
.explorer-destination {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--explorer-bg-primary);
  border: 1px solid var(--explorer-border-primary);
  border-radius: 8px;
  overflow: hidden;
}

.explorer-destination__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--explorer-bg-secondary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 12px;
  color: var(--explorer-text-secondary);
}

.explorer-destination__title {
  font-weight: 600;
  color: var(--explorer-text-primary);
}

.explorer-destination__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explorer-destination__name-input {
  padding: 4px 8px;
  border: 1px solid var(--explorer-border-primary);
  border-radius: 4px;
  background: var(--explorer-bg-primary);
  color: var(--explorer-text-primary);
  font-size: 11px;
  width: 150px;
}

.explorer-destination__btn {
  background: none;
  border: 1px solid var(--explorer-border-secondary);
  color: var(--explorer-text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.explorer-destination__btn:hover {
  background: var(--explorer-interactive-hover);
  color: var(--explorer-text-primary);
}

.explorer-destination__btn--primary {
  background: var(--explorer-interactive-success);
  color: var(--explorer-text-inverse);
  border-color: var(--explorer-interactive-success);
}

.explorer-destination__btn--primary:hover {
  background: var(--explorer-interactive-primary);
}

.explorer-destination__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explorer-destination__tabs {
  display: flex;
  background: var(--explorer-bg-tertiary);
  border-bottom: 1px solid var(--explorer-border-primary);
}

.explorer-destination__tab {
  background: none;
  border: none;
  padding: 12px 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--explorer-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.explorer-destination__tab:hover {
  background: var(--explorer-interactive-hover);
  color: var(--explorer-text-primary);
}

.explorer-destination__tab--active {
  color: var(--explorer-interactive-primary);
  border-bottom-color: var(--explorer-interactive-primary);
  background: var(--explorer-bg-primary);
}

.explorer-destination__tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explorer-destination__editor-section {
  display: none;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.explorer-destination__editor-section--active {
  display: flex;
}

.explorer-destination__editor-header {
  padding: 8px 12px;
  background: var(--explorer-bg-secondary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 11px;
  color: var(--explorer-text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.explorer-destination__editor {
  flex: 1;
}

.explorer-destination__test-section {
  display: none;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.explorer-destination__test-section--active {
  display: flex;
}

.explorer-destination__test-form {
  padding: 16px;
  background: var(--explorer-bg-secondary);
  border-bottom: 1px solid var(--explorer-border-primary);
}

.explorer-destination__test-input {
  width: 100%;
  height: 120px;
  padding: 8px;
  border: 1px solid var(--explorer-border-primary);
  border-radius: 4px;
  background: var(--explorer-bg-primary);
  color: var(--explorer-text-primary);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  resize: vertical;
}

.explorer-destination__test-results {
  flex: 1;
}

.explorer-destination__templates {
  padding: 16px;
  background: var(--explorer-bg-secondary);
  border-bottom: 1px solid var(--explorer-border-primary);
}

.explorer-destination__template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.explorer-destination__template {
  padding: 8px 12px;
  background: var(--explorer-bg-primary);
  border: 1px solid var(--explorer-border-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  font-size: 12px;
}

.explorer-destination__template:hover {
  background: var(--explorer-interactive-hover);
  border-color: var(--explorer-interactive-primary);
}

.explorer-destination__validation {
  padding: 8px 12px;
  background: var(--explorer-bg-tertiary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 11px;
}

.explorer-destination__validation-item {
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.explorer-destination__validation-item--error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--explorer-interactive-error);
}

.explorer-destination__validation-item--warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--explorer-interactive-warning);
}

.explorer-destination__validation-item--info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--explorer-interactive-primary);
}

/* Responsive design */
@media (max-width: 768px) {
  .explorer-destination__header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .explorer-destination__controls {
    justify-content: space-between;
  }
  
  .explorer-destination__tabs {
    overflow-x: auto;
  }
  
  .explorer-destination__tab {
    white-space: nowrap;
    padding: 8px 16px;
  }
}
`;

    injectCSS(css, 'explorer-destination-styles');
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): void {
    element.innerHTML = '';

    // Create header
    const header = createElement('div', {
      className: 'explorer-destination__header',
    });

    const title = createElement('div', {
      className: 'explorer-destination__title',
      textContent: 'Destination Editor',
    });

    const controls = createElement('div', {
      className: 'explorer-destination__controls',
    });

    // Name input
    const nameInput = createElement('input', {
      className: 'explorer-destination__name-input',
      value: currentConfig.name,
      placeholder: 'Destination name',
    }) as HTMLInputElement;

    const onNameChange = () => {
      currentConfig.name = nameInput.value;
      options.onConfigChange?.(currentConfig);
    };
    cleanupFunctions.push(addEventListener(nameInput, 'input', onNameChange));

    controls.appendChild(nameInput);

    // Template button
    if (options.showTemplates !== false) {
      const templatesBtn = createElement('button', {
        className: 'explorer-destination__btn',
        textContent: 'Templates',
      }) as HTMLButtonElement;

      const onTemplates = () => {
        showTemplateSelector();
      };
      cleanupFunctions.push(
        addEventListener(templatesBtn, 'click', onTemplates),
      );

      controls.appendChild(templatesBtn);
    }

    // Validate button
    if (options.enableValidation !== false) {
      const validateBtn = createElement('button', {
        className: 'explorer-destination__btn',
        textContent: 'Validate',
      }) as HTMLButtonElement;

      const onValidate = () => {
        validateCurrentConfig();
      };
      cleanupFunctions.push(addEventListener(validateBtn, 'click', onValidate));

      controls.appendChild(validateBtn);
    }

    // Export button
    const exportBtn = createElement('button', {
      className: 'explorer-destination__btn',
      textContent: 'Export',
    }) as HTMLButtonElement;

    const onExport = () => {
      exportCurrentConfig();
    };
    cleanupFunctions.push(addEventListener(exportBtn, 'click', onExport));

    controls.appendChild(exportBtn);

    header.appendChild(title);
    header.appendChild(controls);
    element.appendChild(header);

    // Create tabs
    const tabs = createElement('div', {
      className: 'explorer-destination__tabs',
    });

    const configTab = createTab(
      'config',
      'Configuration',
      activeTab === 'config',
    );
    const initTab = createTab('init', 'Initialize', activeTab === 'init');
    const pushTab = createTab('push', 'Push Events', activeTab === 'push');

    tabs.appendChild(configTab);
    tabs.appendChild(initTab);
    tabs.appendChild(pushTab);

    if (options.showTesting !== false) {
      const testTab = createTab('test', 'Test', activeTab === 'test');
      tabs.appendChild(testTab);
    }

    element.appendChild(tabs);

    // Create content container
    const content = createElement('div', {
      className: 'explorer-destination__content',
    });

    // Create tab content
    const tabContent = createElement('div', {
      className: 'explorer-destination__tab-content',
    });

    // Config section
    const configSection = createElement('div', {
      className: `explorer-destination__editor-section ${activeTab === 'config' ? 'explorer-destination__editor-section--active' : ''}`,
    });

    const configHeader = createElement('div', {
      className: 'explorer-destination__editor-header',
      innerHTML:
        '<span>JSON Configuration</span><span>Edit destination settings</span>',
    });

    const configEditorEl = createElement('div', {
      className: 'explorer-destination__editor',
    });

    configSection.appendChild(configHeader);
    configSection.appendChild(configEditorEl);
    tabContent.appendChild(configSection);

    // Init section
    const initSection = createElement('div', {
      className: `explorer-destination__editor-section ${activeTab === 'init' ? 'explorer-destination__editor-section--active' : ''}`,
    });

    const initHeader = createElement('div', {
      className: 'explorer-destination__editor-header',
      innerHTML:
        '<span>Initialization Code</span><span>JavaScript to setup the destination</span>',
    });

    const initEditorEl = createElement('div', {
      className: 'explorer-destination__editor',
    });

    initSection.appendChild(initHeader);
    initSection.appendChild(initEditorEl);
    tabContent.appendChild(initSection);

    // Push section
    const pushSection = createElement('div', {
      className: `explorer-destination__editor-section ${activeTab === 'push' ? 'explorer-destination__editor-section--active' : ''}`,
    });

    const pushHeader = createElement('div', {
      className: 'explorer-destination__editor-header',
      innerHTML:
        '<span>Push Function</span><span>JavaScript to handle incoming events</span>',
    });

    const pushEditorEl = createElement('div', {
      className: 'explorer-destination__editor',
    });

    pushSection.appendChild(pushHeader);
    pushSection.appendChild(pushEditorEl);
    tabContent.appendChild(pushSection);

    // Test section
    if (options.showTesting !== false) {
      const testSection = createElement('div', {
        className: `explorer-destination__test-section ${activeTab === 'test' ? 'explorer-destination__test-section--active' : ''}`,
      });

      const testForm = createElement('div', {
        className: 'explorer-destination__test-form',
      });

      const testLabel = createElement('label', {
        textContent: 'Test Event (JSON):',
        style: 'display: block; margin-bottom: 8px; font-weight: 600;',
      });

      const testInput = createElement('textarea', {
        className: 'explorer-destination__test-input',
        placeholder: 'Enter a walkerOS event to test...',
        value: JSON.stringify(
          {
            event: 'page view',
            data: { page: 'home', title: 'Homepage' },
            context: { page: { title: 'My Website' } },
            user: { id: 'user123' },
          },
          null,
          2,
        ),
      }) as HTMLTextAreaElement;

      const testBtn = createElement('button', {
        className:
          'explorer-destination__btn explorer-destination__btn--primary',
        textContent: 'Run Test',
        style: 'margin-top: 8px;',
      }) as HTMLButtonElement;

      const onTest = () => {
        runDestinationTest(testInput.value);
      };
      cleanupFunctions.push(addEventListener(testBtn, 'click', onTest));

      testForm.appendChild(testLabel);
      testForm.appendChild(testInput);
      testForm.appendChild(testBtn);
      testSection.appendChild(testForm);

      const testResultsEl = createElement('div', {
        className: 'explorer-destination__test-results',
      });
      testSection.appendChild(testResultsEl);

      // Initialize results display
      resultsDisplay = createResultDisplay(testResultsEl, {
        showCopyButton: true,
        showTimestamps: true,
        height: '100%',
      });

      tabContent.appendChild(testSection);
    }

    content.appendChild(tabContent);
    element.appendChild(content);

    // Set height
    if (options.height) {
      element.style.height = options.height;
    }

    // Initialize editors
    initializeEditors(configEditorEl, initEditorEl, pushEditorEl);

    // Initial validation
    if (options.enableValidation !== false) {
      validateCurrentConfig();
    }
  }

  /**
   * Create a tab element
   */
  function createTab(
    tab: string,
    label: string,
    active: boolean,
  ): HTMLButtonElement {
    const tabEl = createElement('button', {
      className: `explorer-destination__tab ${active ? 'explorer-destination__tab--active' : ''}`,
      textContent: label,
    }) as HTMLButtonElement;

    const onTabClick = () => {
      switchTab(tab as any);
    };

    cleanupFunctions.push(addEventListener(tabEl, 'click', onTabClick));

    return tabEl;
  }

  /**
   * Switch active tab
   */
  function switchTab(tab: 'config' | 'init' | 'push' | 'test'): void {
    activeTab = tab;

    // Update tab states
    const tabs = element.querySelectorAll('.explorer-destination__tab');
    tabs.forEach((tabEl, index) => {
      const isActive = ['config', 'init', 'push', 'test'][index] === tab;
      tabEl.classList.toggle('explorer-destination__tab--active', isActive);
    });

    // Update section visibility
    const sections = element.querySelectorAll(
      '.explorer-destination__editor-section, .explorer-destination__test-section',
    );
    sections.forEach((sectionEl, index) => {
      const isActive = ['config', 'init', 'push', 'test'][index] === tab;
      sectionEl.classList.toggle(
        'explorer-destination__editor-section--active',
        isActive,
      );
      sectionEl.classList.toggle(
        'explorer-destination__test-section--active',
        isActive,
      );
    });
  }

  /**
   * Initialize the code editors
   */
  function initializeEditors(
    configEl: HTMLElement,
    initEl: HTMLElement,
    pushEl: HTMLElement,
  ): void {
    // Config editor (JSON)
    configEditor = createCodeEditor(configEl, {
      language: 'json',
      value: JSON.stringify(currentConfig.config, null, 2),
      height: '100%',
      onChange: () => {
        debouncedConfigUpdate();
      },
    });

    // Init editor (JavaScript)
    initEditor = createCodeEditor(initEl, {
      language: 'javascript',
      value: currentConfig.init || '',
      height: '100%',
      onChange: () => {
        debouncedConfigUpdate();
      },
    });

    // Push editor (JavaScript)
    pushEditor = createCodeEditor(pushEl, {
      language: 'javascript',
      value: currentConfig.push || '',
      height: '100%',
      onChange: () => {
        debouncedConfigUpdate();
      },
    });
  }

  /**
   * Update configuration from editors
   */
  function updateConfig(): void {
    try {
      currentConfig.config = JSON.parse(configEditor.getValue());
    } catch (e) {
      // Invalid JSON, keep previous config
    }

    currentConfig.init = initEditor.getValue();
    currentConfig.push = pushEditor.getValue();

    options.onConfigChange?.(currentConfig);
  }

  /**
   * Validate current configuration
   */
  function validateCurrentConfig(): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Validate JSON config
    try {
      JSON.parse(configEditor.getValue());
    } catch (e) {
      results.push({
        type: 'error',
        message: 'Invalid JSON in configuration',
        field: 'config',
        code: 'INVALID_JSON',
      });
    }

    // Validate init code
    if (!currentConfig.init?.trim()) {
      results.push({
        type: 'warning',
        message: 'No initialization code provided',
        field: 'init',
        code: 'MISSING_INIT',
      });
    }

    // Validate push code
    if (!currentConfig.push?.trim()) {
      results.push({
        type: 'error',
        message: 'Push function is required',
        field: 'push',
        code: 'MISSING_PUSH',
      });
    }

    // Custom validation
    const customResults = options.onValidate?.(currentConfig) || [];
    results.push(...customResults);

    // Display validation results
    displayValidationResults(results);

    return results;
  }

  /**
   * Display validation results
   */
  function displayValidationResults(results: ValidationResult[]): void {
    // Remove existing validation display
    const existing = element.querySelector('.explorer-destination__validation');
    if (existing) {
      existing.remove();
    }

    if (results.length === 0) return;

    const validation = createElement('div', {
      className: 'explorer-destination__validation',
    });

    results.forEach((result) => {
      const item = createElement('div', {
        className: `explorer-destination__validation-item explorer-destination__validation-item--${result.type}`,
      });

      const icon =
        result.type === 'error'
          ? '❌'
          : result.type === 'warning'
            ? '⚠️'
            : 'ℹ️';
      item.innerHTML = `<span>${icon}</span><span>${result.message}</span>`;

      validation.appendChild(item);
    });

    // Insert after tabs
    const tabs = element.querySelector('.explorer-destination__tabs');
    if (tabs && tabs.nextSibling) {
      element.insertBefore(validation, tabs.nextSibling);
    }
  }

  /**
   * Show template selector
   */
  function showTemplateSelector(): void {
    // Create modal overlay
    const overlay = createElement('div', {
      style:
        'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;',
    });

    const modal = createElement('div', {
      style:
        'background: var(--explorer-bg-primary); border-radius: 8px; padding: 20px; max-width: 600px; width: 90%;',
    });

    const title = createElement('h3', {
      textContent: 'Select Template',
      style: 'margin: 0 0 16px 0; color: var(--explorer-text-primary);',
    });

    const templateGrid = createElement('div', {
      className: 'explorer-destination__template-grid',
    });

    Object.entries(DESTINATION_TEMPLATES).forEach(([name, template]) => {
      const templateEl = createElement('div', {
        className: 'explorer-destination__template',
        textContent: name,
      });

      const onSelect = () => {
        loadTemplate(name);
        document.body.removeChild(overlay);
      };
      addEventListener(templateEl, 'click', onSelect);

      templateGrid.appendChild(templateEl);
    });

    const closeBtn = createElement('button', {
      className: 'explorer-destination__btn',
      textContent: 'Close',
      style: 'margin-top: 16px;',
    }) as HTMLButtonElement;

    const onClose = () => {
      document.body.removeChild(overlay);
    };
    addEventListener(closeBtn, 'click', onClose);
    addEventListener(overlay, 'click', (e) => {
      if (e.target === overlay) onClose();
    });

    modal.appendChild(title);
    modal.appendChild(templateGrid);
    modal.appendChild(closeBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /**
   * Load a template
   */
  function loadTemplate(templateName: string): void {
    const template = DESTINATION_TEMPLATES[templateName];
    if (!template) return;

    currentConfig = { ...template };

    // Update editors
    configEditor.setValue(JSON.stringify(template.config, null, 2));
    initEditor.setValue(template.init || '');
    pushEditor.setValue(template.push || '');

    // Update name input
    const nameInput = element.querySelector(
      '.explorer-destination__name-input',
    ) as HTMLInputElement;
    if (nameInput) {
      nameInput.value = template.name;
    }

    validateCurrentConfig();
    options.onConfigChange?.(currentConfig);
  }

  /**
   * Run destination test
   */
  async function runDestinationTest(eventJson: string): Promise<void> {
    if (!resultsDisplay) return;

    try {
      const testEvent = JSON.parse(eventJson) as WalkerEvent;

      resultsDisplay.addInfo('Running destination test...', 'Test');

      const result = await testDestination(testEvent);
      resultsDisplay.addValue(result, 'Test Result');

      options.onTest?.(currentConfig, testEvent);
    } catch (error) {
      resultsDisplay.addError(
        error instanceof Error ? error.message : String(error),
        'Test Error',
      );
    }
  }

  /**
   * Test destination with event
   */
  async function testDestination(event: WalkerEvent): Promise<unknown> {
    // Execute init code
    let destinationConfig;
    try {
      const initFunction = new Function(
        'config',
        currentConfig.init || 'return config;',
      );
      destinationConfig = initFunction(currentConfig.config);
    } catch (error) {
      throw new Error(`Initialization failed: ${error}`);
    }

    // Execute push code
    try {
      const pushFunction = new Function(
        'eventData',
        'destinationConfig',
        currentConfig.push || 'return {};',
      );
      return pushFunction(event, destinationConfig);
    } catch (error) {
      throw new Error(`Push failed: ${error}`);
    }
  }

  /**
   * Export configuration
   */
  function exportCurrentConfig(): void {
    const exported = JSON.stringify(currentConfig, null, 2);

    // Create download
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentConfig.id || 'destination'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Enhanced API
  const api: DestinationAPI = {
    ...baseComponent,

    getConfig(): DestinationConfig {
      updateConfig();
      return { ...currentConfig };
    },

    setConfig(config: DestinationConfig): void {
      currentConfig = { ...config };

      configEditor.setValue(JSON.stringify(config.config, null, 2));
      initEditor.setValue(config.init || '');
      pushEditor.setValue(config.push || '');

      const nameInput = element.querySelector(
        '.explorer-destination__name-input',
      ) as HTMLInputElement;
      if (nameInput) {
        nameInput.value = config.name;
      }

      validateCurrentConfig();
    },

    async testDestination(event: WalkerEvent): Promise<unknown> {
      return testDestination(event);
    },

    validateConfig(): ValidationResult[] {
      return validateCurrentConfig();
    },

    exportConfig(): string {
      updateConfig();
      return JSON.stringify(currentConfig, null, 2);
    },

    importConfig(json: string): boolean {
      try {
        const config = JSON.parse(json);
        this.setConfig(config);
        return true;
      } catch {
        return false;
      }
    },

    loadTemplate(templateName: string): void {
      loadTemplate(templateName);
    },

    getAvailableTemplates(): string[] {
      return Object.keys(DESTINATION_TEMPLATES);
    },

    destroy(): void {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;

      configEditor?.destroy();
      initEditor?.destroy();
      pushEditor?.destroy();
      resultsDisplay?.destroy();

      baseComponent.destroy();
    },
  };

  // Initialize component
  injectStyles();
  createDOM();

  // Mount the base component
  api.mount();

  return api;
}
