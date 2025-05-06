import { getEvent } from '@elbwalker/utils';

export function Purchase() {
  const event = getEvent('order complete');

  return {
    data: [
      {
        event_name: 'Purchase',
        event_time: event.timestamp, // /1000?
        event_id: event.id,
        event_source_url: event.source.id,
        action_source: 'website',
        user_data: {},
      },
    ],
  };
}
