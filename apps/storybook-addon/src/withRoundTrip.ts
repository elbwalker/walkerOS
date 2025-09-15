import type { WalkerOSAddon } from './types';
import type { DecoratorFunction } from 'storybook/internal/types';
import { addons } from 'storybook/preview-api';
import { getAllEvents } from '@walkeros/web-source-browser';

import { ADDON_ID, EVENTS } from './constants';
import { initializeWalker } from './walker';
import { getStoryRootElement, enhanceProperties } from './utils/domUtils';
import { buildAttributeTree } from './utils/attributeTreeUtils';
import { setupHighlighting } from './utils/highlightingUtils';

// Set up the channel listener globally, not per story
const channel = addons.getChannel();
let currentCanvasElement: Element | null = null;
let currentStoryId: string | null = null;

// Global listener for the request events
channel.addListener(EVENTS.REQUEST, (config: WalkerOSAddon) => {
  const storyRoot = getStoryRootElement();
  if (!storyRoot) {
    channel.emit(EVENTS.RESULT, []);
    return;
  }

  // Enhance DOM with property attributes
  enhanceProperties(storyRoot, config.prefix || 'data-elb');

  const events = getAllEvents(storyRoot as Element, config.prefix);

  // Send the result back to the manager
  channel.emit(EVENTS.RESULT, events);
});

// Global listener for highlighting events
channel.addListener(EVENTS.HIGHLIGHT, (config: WalkerOSAddon) => {
  setupHighlighting(config.highlights, config.prefix);
});

// Global listener for attribute tree requests
channel.addListener(EVENTS.ATTRIBUTES_REQUEST, (config: WalkerOSAddon) => {
  const storyRoot = getStoryRootElement();
  if (!storyRoot) {
    channel.emit(EVENTS.ATTRIBUTES_RESULT, []);
    return;
  }

  // Build the attribute tree
  const attributeTree = buildAttributeTree(
    storyRoot as Element,
    config.prefix || 'data-elb',
  );

  // Send the result back to the manager
  channel.emit(EVENTS.ATTRIBUTES_RESULT, attributeTree);
});

export const withRoundTrip: DecoratorFunction = (storyFn, context) => {
  // Update the current canvas element when a story renders
  currentCanvasElement = context.canvasElement as Element;

  // Check if story changed and auto-run is enabled
  const storyId = context.id;
  const hasStoryChanged = currentStoryId !== storyId;
  const { parameters } = context;
  const autoRefresh = parameters?.[ADDON_ID]?.autoRefresh;

  if (hasStoryChanged) {
    currentStoryId = storyId;
  }

  const result = storyFn();

  // Initialize walker and inject CSS after story renders
  setTimeout(() => {
    // Initialize walkerOS for live event capture
    const prefix = parameters?.[ADDON_ID]?.prefix || 'data-elb';
    const autoRefresh = parameters?.[ADDON_ID]?.autoRefresh;
    initializeWalker({ prefix, autoRefresh }).catch((err) => {
      console.error('Walker initialization failed:', err);
    });

    // Inject highlighting CSS and enhance properties
    const storyRoot = getStoryRootElement();
    if (storyRoot) {
      setupHighlighting(undefined, prefix);
      enhanceProperties(storyRoot, prefix);
    }

    // Auto-run walker if story changed and auto-refresh is enabled
    if (hasStoryChanged && autoRefresh && window.__storybookElb) {
      window.__storybookElb('walker run');
    }
  }, 200);

  return result;
};
