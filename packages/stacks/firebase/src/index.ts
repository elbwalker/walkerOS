import type { NodeClient } from '@elbwalker/node-client';
import type { FirebaseStack } from './types';
import type { Elbwalker } from '@elbwalker/types'; // @TODO tmp
import createNodeClient from '@elbwalker/node-client';
import { onRequest } from 'firebase-functions/v2/https';

// Types
export * from './types';

export function firebaseStack(
  customConfig: FirebaseStack.PartialConfig = {},
): FirebaseStack.Function {
  const config = getConfig(customConfig);
  const { elb, instance } = createNodeClient(config.client);

  const push: FirebaseStack.Push = (options) => {
    return pushFn(instance, options);
  };

  const stack: FirebaseStack.Function = {
    config,
    instance,
    elb,
    push,
  };

  return stack;
}

function getConfig(
  customConfig: FirebaseStack.PartialConfig = {},
): FirebaseStack.Config {
  const defaultConfig: FirebaseStack.Config = {
    firebase: {},
    client: {},
  };

  return { ...defaultConfig, ...customConfig };
}

const pushFn: NodeClient.PrependInstance<FirebaseStack.Push> = (
  instance,
  options = {},
) => {
  return onRequest(options, async (req, res) => {
    // ATTENTION! Never process unknown data from the client

    // @TODO validate req body
    // @TODO const event = req.body
    const event: Elbwalker.Event = {
      event: 'foo bar',
      data: { foo: 'bar' },
      custom: { bar: 'baz' },
      context: { dev: ['test', 1] },
      globals: { lang: 'ts' },
      user: { id: 'us3r', device: 'c00k13', session: 's3ss10n' },
      nested: [
        {
          type: 'child',
          data: { type: 'nested' },
          nested: [],
          context: { element: ['child', 0] },
        },
      ],
      consent: { debugging: true },
      id: '1-gr0up-1',
      trigger: 'test',
      entity: 'entity',
      action: 'action',
      timestamp: 1690561989523,
      timing: 3.14,
      group: 'gr0up',
      count: 1,
      version: {
        client: '0.0.7',
        tagging: 1,
      },
      source: {
        type: 'jest',
        id: 'https://localhost:80',
        previous_id: 'http://remotehost:9001',
      },
    };

    const result = await instance.push(event);
    // @TODO handle errors and status codes
    res.status(200).send({ params: req.params, result });
  });
};
