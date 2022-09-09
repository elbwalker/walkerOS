import { Elbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    // add types
  }
}

export interface DestinationEventPipe extends WebDestination.Function {
  config: WebDestination.Config & {
    api?: string;
    projectId?: string;
    exclusionParameters?: ExclusionParameters;
  };
}

type ExclusionParameters = string[];

// Globals
const w = window;
let api: string;
let projectId: string;
let exclusionParameters: ExclusionParameters;

export const destination: DestinationEventPipe = {
  config: {},

  init() {
    let config = this.config;

    // require projectId
    if (!config.projectId) return false;

    api = config.api || 'https://moin.p.elbwalkerapis.com/lama';
    projectId = config.projectId;
    exclusionParameters = config.exclusionParameters || [];

    return true;
  },

  push(event: Elbwalker.Event) {
    const href = excludeParameters(location.href, exclusionParameters);
    const referrer = excludeParameters(document.referrer, exclusionParameters);

    // Custom check for default the page view event with search parameter
    if (event.event === 'page view' && event.data && event.data.search) {
      const origin = location.origin;
      const search = excludeParameters(
        origin + event.data.search,
        exclusionParameters,
      );
      event.data.search = search.substring(origin.length + 1);
    }

    const payload = {
      ...event,
      projectId,
      source: {
        type: 'web',
        id: href,
        referrer,
        version: '3',
      },
    };

    const xhr = new XMLHttpRequest();
    xhr.open('POST', api, true);
    xhr.setRequestHeader('Content-type', 'text/plain; charset=utf-8');
    xhr.send(JSON.stringify(payload));
  },
};

function excludeParameters(
  href: string,
  exclusionParameters: ExclusionParameters,
): string {
  if (!exclusionParameters.length) return href;

  try {
    let url = new URL(href);
    const searchParams = url.searchParams;

    exclusionParameters.map((parameter) => {
      if (searchParams.has(parameter)) searchParams.set(parameter, 'xxx');
    });

    url.search = searchParams.toString();

    return url.toString();
  } catch (e) {
    return '';
  }
}

export default destination;
