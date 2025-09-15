import React from 'react';
import type { WalkerOS } from '@walkeros/core';
import type { Walker } from '@walkeros/web-core';
import { createEventDataPreview } from './eventPreview';

/**
 * Formats an event title with consistent styling across Events and Live Events tabs
 */
export function formatEventTitle(
  event: WalkerOS.Event | Walker.Event,
  index: number,
): React.ReactNode {
  const dataPreview = createEventDataPreview(event);

  // Build base title components
  const eventNumber = `#${index + 1}`;
  // Handle both WalkerOS.Event (has name property) and Walker.Event (has entity/action)
  const eventName =
    'name' in event ? event.name : `${event.entity} ${event.action}`;

  // Construct base title
  const baseTitle = `${eventNumber} ${eventName}`;

  // Return styled JSX
  if (!dataPreview) {
    return <span className="event-base">{baseTitle}</span>;
  }

  return (
    <>
      <span className="event-base">{baseTitle}</span>
      <span className="event-separator"> - </span>
      <span className="event-preview">{dataPreview}</span>
    </>
  );
}
