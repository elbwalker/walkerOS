import type { WalkerOSAddon } from './types';
import type { DecoratorFunction } from 'storybook/internal/types';
import { addons } from 'storybook/preview-api';
import { getAllEvents } from '@walkeros/web-source-browser';

import { EVENTS } from './constants';
import { initializeWalker } from './walker';

// Set up the channel listener globally, not per story
const channel = addons.getChannel();
let currentCanvasElement: Element | null = null;
let highlightingStyleElement: HTMLStyleElement | null = null;
let currentStoryId: string | null = null;

// Function to get the story document (either iframe or main document)
const getStoryDocument = (): Document => {
  // Try to find story iframe
  const iframe = document.querySelector(
    '#storybook-preview-iframe',
  ) as HTMLIFrameElement;
  if (iframe?.contentDocument) {
    return iframe.contentDocument;
  }
  // Fallback to main document
  return document;
};

// Function to get the story root element
const getStoryRootElement = (): Element | null => {
  const storyDoc = getStoryDocument();

  // Try multiple selectors for story root
  const selectors = [
    '#storybook-root',
    '#root',
    '[data-testid="storybook-root"]',
    'body',
  ];

  for (const selector of selectors) {
    const element = storyDoc.querySelector(selector);
    if (element) {
      return element;
    }
  }

  return storyDoc.body;
};

// Function to inject highlighting CSS into story document
const injectHighlightingCSS = () => {
  const storyDoc = getStoryDocument();

  // Remove existing styles
  const existingStyle = storyDoc.querySelector('#walkeros-highlighting');
  if (existingStyle) {
    existingStyle.remove();
  }

  highlightingStyleElement = storyDoc.createElement('style');
  highlightingStyleElement.id = 'walkeros-highlighting';
  highlightingStyleElement.textContent = `
    /* Highlight colors - original from website */
    :root {
      --highlight-globals: #4fc3f7cc;
      --highlight-context: #ffbd44cc;
      --highlight-entity: #00ca4ecc;
      --highlight-property: #ff605ccc;
      --highlight-action: #9900ffcc;
      --highlight-background: #1f2937;
      --highlight-text: #9ca3af;
      --highlight-hover: rgba(255, 255, 255, 0.05);
      --highlight-separator: rgba(255, 255, 255, 0.05);
    }

    .highlight-globals [data-elbglobals] {
      box-shadow: 0 0 0 2px var(--highlight-globals) !important;
    }

    .highlight-context [data-elbcontext] {
      box-shadow: 0 0 0 2px var(--highlight-context) !important;
    }

    .highlight-entity [data-elb] {
      box-shadow: 0 0 0 2px var(--highlight-entity) !important;
    }

    .highlight-property [data-elbproperty] {
      box-shadow: 0 0 0 2px var(--highlight-property) !important;
    }

    .highlight-action [data-elbaction] {
      box-shadow: 0 0 0 2px var(--highlight-action) !important;
    }

    /* Combined highlights with layered solid borders */
    .highlight-entity.highlight-action [data-elb][data-elbaction] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity) !important;
    }

    .highlight-entity.highlight-context [data-elb][data-elbcontext] {
      box-shadow:
        0 0 0 2px var(--highlight-entity),
        0 0 0 4px var(--highlight-context) !important;
    }

    .highlight-entity.highlight-property [data-elb][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-entity),
        0 0 0 4px var(--highlight-property) !important;
    }

    .highlight-action.highlight-context [data-elbaction][data-elbcontext] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-context) !important;
    }

    .highlight-context.highlight-property [data-elbcontext][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-context),
        0 0 0 4px var(--highlight-property) !important;
    }

    .highlight-action.highlight-property [data-elbaction][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-property) !important;
    }

    /* Triple combinations with distinct layers */
    .highlight-entity.highlight-action.highlight-context
      [data-elb][data-elbaction][data-elbcontext] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-context) !important;
    }

    /* Triple combinations with property */
    .highlight-entity.highlight-action.highlight-property
      [data-elb][data-elbaction][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-property) !important;
    }

    .highlight-entity.highlight-context.highlight-property
      [data-elb][data-elbcontext][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-context),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-property) !important;
    }

    .highlight-action.highlight-context.highlight-property
      [data-elbaction][data-elbcontext][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-context),
        0 0 0 6px var(--highlight-property) !important;
    }

    /* Quadruple combination */
    .highlight-entity.highlight-action.highlight-context.highlight-property
      [data-elb][data-elbaction][data-elbcontext][data-elbproperty] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-context),
        0 0 0 8px var(--highlight-property) !important;
    }
  `;

  storyDoc.head.appendChild(highlightingStyleElement);
};

// Function to enhance DOM with property attributes
const enhanceProperties = (prefix: string = 'data-elb') => {
  const storyRoot = getStoryRootElement();
  if (!storyRoot) return;

  // Find all elements with any attributes starting with prefix-
  const allElements = Array.from(storyRoot.querySelectorAll('*'));

  allElements.forEach((el) => {
    const attributes = Array.from(el.attributes);
    let hasProperties = false;

    attributes.forEach((attr) => {
      // Check if attribute starts with prefix- (e.g., data-elb-button, data-elb-product)
      if (
        attr.name.startsWith(`${prefix}-`) &&
        attr.name !== `${prefix}action` &&
        attr.name !== `${prefix}context` &&
        attr.name !== `${prefix}globals`
      ) {
        hasProperties = true;
      }
    });

    // Mark elements with property attributes
    if (hasProperties) {
      el.setAttribute('data-elbproperty', '');
    }
  });
};

// Function to apply highlighting to story root
const applyHighlighting = (highlights: WalkerOSAddon['highlights']) => {
  const storyRoot = getStoryRootElement();
  if (!storyRoot) return;

  // Remove existing highlighting classes
  storyRoot.classList.remove('highlight-context');
  storyRoot.classList.remove('highlight-entity');
  storyRoot.classList.remove('highlight-property');
  storyRoot.classList.remove('highlight-action');

  if (!highlights) return;

  // Re-enhance properties FIRST to ensure they're marked
  enhanceProperties();

  // Then add specific highlighting classes
  if (highlights.context) storyRoot.classList.add('highlight-context');
  if (highlights.entity) storyRoot.classList.add('highlight-entity');
  if (highlights.property) storyRoot.classList.add('highlight-property');
  if (highlights.action) storyRoot.classList.add('highlight-action');
};

// Global listener for the request events
channel.addListener(EVENTS.REQUEST, (config: WalkerOSAddon) => {
  const storyRoot = getStoryRootElement();
  if (!storyRoot) {
    channel.emit(EVENTS.RESULT, []);
    return;
  }

  // Enhance DOM with property attributes
  enhanceProperties(config.prefix || 'data-elb');

  const events = getAllEvents(storyRoot as Element, config.prefix);

  // Send the result back to the manager
  channel.emit(EVENTS.RESULT, events);
});

// Global listener for highlighting events
channel.addListener(EVENTS.HIGHLIGHT, (config: WalkerOSAddon) => {
  // Always inject CSS first
  injectHighlightingCSS();

  // Then apply highlighting
  applyHighlighting(config.highlights);
});

export const withRoundTrip: DecoratorFunction = (storyFn, context) => {
  // Update the current canvas element when a story renders
  currentCanvasElement = context.canvasElement as Element;

  // Check if story changed and auto-run is enabled
  const storyId = context.id;
  const hasStoryChanged = currentStoryId !== storyId;
  const globals = context.globals;
  const autoRefresh = globals?.walkerOS?.autoRefresh;

  if (hasStoryChanged) {
    currentStoryId = storyId;
  }

  const result = storyFn();

  // Initialize walker and inject CSS after story renders
  setTimeout(() => {
    // Initialize walkerOS for live event capture
    initializeWalker().catch((err) => {
      console.error('Walker initialization failed:', err);
    });

    // Inject highlighting CSS and enhance properties
    injectHighlightingCSS();
    enhanceProperties();

    // Auto-run walker if story changed and auto-refresh is enabled
    if (hasStoryChanged && autoRefresh && window.elb) {
      window.elb('walker run');
    }
  }, 200);

  return result;
};
