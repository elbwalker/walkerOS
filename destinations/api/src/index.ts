import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {}
}

const w = window;

export namespace DestinationAPI {
  export interface Config extends WebDestination.Config {
    custom?: {
      url?: string;
      transport?: Transport;
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
  }

  type Transport = 'fetch' | 'xhr';
}

export const destination: DestinationAPI.Function = {
  config: {},

  init(config: DestinationAPI.Config) {
    // Do something initializing

    return true;
  },

  push(
    event: IElbwalker.Event,
    config: DestinationAPI.Config = {},
    mapping: DestinationAPI.EventConfig = {},
  ): void {
    const custom = config.custom || {};

    if (!custom.url) return;

    const data = JSON.stringify(event);
    switch (custom.transport) {
      case 'xhr':
        sendAsXhr(data, custom.url);
        break;
      case 'fetch':
      default:
        sendAsFetch(data, custom.url);
        break;
    }
  },
};

function sendAsFetch(data: string, url: string) {
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true, // Sending data even after the tab is closed
    body: data,
  });
}

function sendAsXhr(data: string, url: string) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-type', 'text/plain; charset=utf-8');
  xhr.send(data);
}

export default destination;
