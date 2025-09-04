import React from 'react';
import type { WalkerOS } from '@walkeros/core';
import { createEventDataPreview } from './eventPreview';

/**
 * Formats an event title with consistent styling across Events and Live Events tabs
 */
export function formatEventTitle(
  event: WalkerOS.Event,
  index: number,
  includeTime: boolean = false,
  timestamp?: number,
): React.ReactNode {
  const dataPreview = createEventDataPreview(event);

  // Build base title components
  const eventNumber = `#${index + 1}`;
  const timeString =
    includeTime && timestamp ? new Date(timestamp).toLocaleTimeString() : '';
  const eventName = `${event.entity} ${event.action}`;

  // Construct base title
  const baseTitle = includeTime
    ? `${eventNumber} ${timeString} ${eventName}`
    : `${eventNumber} ${eventName}`;

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
