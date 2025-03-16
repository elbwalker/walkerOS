import type { WalkerOS } from '@elbwalker/types';
import type { Custom, PushFn } from './types';
import { requestToParameter } from '@elbwalker/utils';
import { sendNode } from '@elbwalker/utils/node';
import { getParameters } from '@elbwalker/destination-core-etag';

export const push: PushFn = async function (pushEvent, config) {
  const { custom } = config;

  if (!custom) return;

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
};

async function sendRequest(custom: Custom, path: string, body?: string) {
  const url = custom.url || 'https://region1.google-analytics.com/g/collect?';

  return sendNode(url + path, body, {
    headers: custom.headers || {},
    method: 'POST',
  });
}
