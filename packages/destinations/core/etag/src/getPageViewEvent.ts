import type { WalkerOS } from '@elbwalker/types';
import { getId } from '@elbwalker/utils';

export function getPageViewEvent(event: WalkerOS.Event): WalkerOS.Event {
  const pageViewEvent = {
    ...event, // Create a virtual page_view event by copying the original event
    event: 'page_view',
    entity: 'page',
    action: 'view',
    trigger: 'etag',
    id: String(event.id || getId(5)).slice(0, -1) + '0', // Change the event ID
    data: {}, // @TODO Add data
    context: {},
  };

  return pageViewEvent;
}
