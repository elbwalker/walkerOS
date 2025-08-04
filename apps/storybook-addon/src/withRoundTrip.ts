import type { WalkerOSAddon } from 'src/types';
import type { DecoratorFunction } from 'storybook/internal/types';
import { addons } from 'storybook/preview-api';
import { getAllEvents } from '@walkeros/web-source-browser';

import { EVENTS } from './constants';

// Set up the channel listener globally, not per story
const channel = addons.getChannel();
let currentCanvasElement: Element | null = null;

// Global listener for the request events
channel.addListener(EVENTS.REQUEST, (config: WalkerOSAddon) => {
  // Try to find the canvas element if we don't have it yet
  const canvasElement =
    currentCanvasElement ||
    document.querySelector('#storybook-root') ||
    document.body;

  const events = getAllEvents(canvasElement as Element, config.prefix);

  // Send the result back to the manager
  channel.emit(EVENTS.RESULT, events);
});

export const withRoundTrip: DecoratorFunction = (storyFn, context) => {
  // Update the current canvas element when a story renders
  currentCanvasElement = context.canvasElement as Element;

  return storyFn();
};
