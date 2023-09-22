import type { NodeClient, NodeDestination } from '@elbwalker/node-client';
import type { FirebaseStack } from './types';
import createNodeClient from '@elbwalker/node-client';
import { onRequest } from 'firebase-functions/v2/https';

// Types
export * from './types';

export function firebaseStack(
  customConfig: FirebaseStack.PartialConfig = {},
): FirebaseStack.Function {
  const config = getConfig(customConfig);
  const client = createNodeClient(config.client).instance;

  const push: FirebaseStack.Push = (options) => {
    return pushFn(client, options);
  };

  const instance: FirebaseStack.Function = {
    config,
    push,
  };

  return instance;
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
    const event = { event: 'a b', data: { c: 'd' } };
    const result = await instance.push(event);
    // @TODO handle errors and status codes
    res.status(200).send({ params: req.params, result });
  });
};
