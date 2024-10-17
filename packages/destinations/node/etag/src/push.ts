import type { WalkerOS } from '@elbwalker/types';
import type { CustomConfig, PushFn } from './types';
import { requestToParameter, sendNode } from '@elbwalker/utils';
import { getParameters } from '@elbwalker/destination-core-etag';

export const push: PushFn = async function (pushEvent, config) {
  const { custom } = config;

  if (!custom) return {};

  // @TODO
  let pageTitle;
  let userAgent;
  let language;

  const context = {
    userAgent,
    pageTitle,
    language,
  };

  const events: WalkerOS.Events = [pushEvent];

  const parameters = getParameters(events, custom, context);

  await Promise.all(
    parameters.map((parameter) => {
      return sendRequest(
        custom,
        requestToParameter(parameter.path),
        parameter.body,
      );
    }),
  );

  return { queue: [] }; // @TODO
};

async function sendRequest(custom: CustomConfig, path: string, body?: string) {
  const url = custom.url || 'https://region1.google-analytics.com/g/collect?';

  return sendNode(url + path, body, {
    headers: custom.headers || {},
    method: 'POST',
  });
}
