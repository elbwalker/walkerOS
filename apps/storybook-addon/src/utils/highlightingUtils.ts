// Utilities for managing DOM highlighting

import type { WalkerOSAddon } from '../types';
import {
  getStoryDocument,
  getStoryRootElement,
  enhanceProperties,
} from './domUtils';
import { injectHighlightingCSS } from './cssUtils';

// Function to apply highlighting to story root
export const applyHighlighting = (
  highlights: WalkerOSAddon['highlights'],
  prefix: string = 'data-custom',
): void => {
  const storyRoot = getStoryRootElement();
  if (!storyRoot) return;

  // Remove existing highlighting classes
  storyRoot.classList.remove('highlight-context');
  storyRoot.classList.remove('highlight-entity');
  storyRoot.classList.remove('highlight-property');
  storyRoot.classList.remove('highlight-action');
  storyRoot.classList.remove('highlight-globals');

  if (!highlights) return;

  // Re-enhance properties FIRST to ensure they're marked
  enhanceProperties(storyRoot, prefix);

  // Then add specific highlighting classes
  if (highlights.context) storyRoot.classList.add('highlight-context');
  if (highlights.entity) storyRoot.classList.add('highlight-entity');
  if (highlights.property) storyRoot.classList.add('highlight-property');
  if (highlights.action) storyRoot.classList.add('highlight-action');
  if (highlights.globals) storyRoot.classList.add('highlight-globals');
};

// Combined function to inject CSS and apply highlighting
export const setupHighlighting = (
  highlights: WalkerOSAddon['highlights'],
  prefix: string = 'data-custom',
): void => {
  const storyDoc = getStoryDocument();

  // Always inject CSS first
  injectHighlightingCSS(storyDoc, prefix);

  // Then apply highlighting
  applyHighlighting(highlights, prefix);
};
