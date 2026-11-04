import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'auth-token': {
    text: 'config.credentials { token } is sent as Authorization: Bearer <token>; back the token with $secret.NAME as the whole value. Never put it in settings or in the url. Requests refuse redirects, so the token never leaves the configured origin. Without credentials no Authorization header is sent.',
    code: [
      {
        lang: 'json',
        code: '{ "settings": { "url": "https://crm.example.com/customers/{key}" }, "credentials": { "token": "$secret.CRM_API_TOKEN" } }',
      },
    ],
  },
  'failure-map': {
    text: '404, 204 and a JSON null body are a miss: a state get applies its mapping fallbacks. Any other non-2xx status throws a transport StepError with the status; a network error, a 5 second timeout or a redirect throws transport; a 2xx body that is not JSON throws decode. The collector reports each cause once at ERROR under store.<id> and the event goes on without the fields. The store is read-only: set and delete throw a config StepError, so a state set against it logs at ERROR per event. With the store cache block, hits are cached for the rule ttl but misses never are, so lookups of client-chosen ids cost one request each; rate limits belong in a gateway in front of the API.',
  },
  'troubleshoot-all-misses': {
    text: 'Every lookup a miss and nothing at ERROR? The url path is likely wrong on the right host, so the API answers 404 for every key. Check it with curl, a known id and the token. A simulation uses the mock fetch and cannot show it.',
  },
};
