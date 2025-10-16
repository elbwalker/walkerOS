import type { Destination } from '@walkeros/core';

/**
 * Creates a gtag-style destination for demo purposes.
 * Formats output as: gtag('event', 'event_name', { data })
 */
export function createGtagDestination(): Destination.Code {
  return {
    type: 'gtag',
    config: {},
    push(event, context) {
      const { data, mapping, env } = context;
      const name = mapping?.name || event.name;

      const formatted = `gtag('event', '${name}', ${JSON.stringify(data, null, 2)});`;
      env.elb(formatted);
    },
  };
}

/**
 * Creates a Facebook Pixel-style destination for demo purposes.
 * Formats output as: fbq('track', 'EventName', { data })
 */
export function createFbqDestination(): Destination.Code {
  return {
    type: 'fbq',
    config: {},
    push(event, context) {
      const { data, mapping, env } = context;
      const name = mapping?.name || event.name;

      const formatted = `fbq('track', '${name}', ${JSON.stringify(data, null, 2)});`;
      env.elb(formatted);
    },
  };
}

/**
 * Creates a Plausible-style destination for demo purposes.
 * Formats output as: plausible('event_name', { props: { data } })
 */
export function createPlausibleDestination(): Destination.Code {
  return {
    type: 'plausible',
    config: {},
    push(event, context) {
      const { data, mapping, env } = context;
      const name = mapping?.name || event.name;

      const formatted = `plausible('${name}', { props: ${JSON.stringify(data, null, 2)} });`;
      env.elb(formatted);
    },
  };
}
