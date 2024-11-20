import type { SourceNode } from '@elbwalker/source-node';
import type { FirebaseStack } from './types';
import { createSourceNode } from '@elbwalker/source-node';
import { tryCatchAsync, validateEvent } from '@elbwalker/utils';
import { onRequest } from 'firebase-functions/v2/https';

// Types
export * from './types';

export function firebaseStack(
  customConfig: FirebaseStack.PartialConfig = {},
): FirebaseStack.Instance {
  const config = getConfig(customConfig);
  const { elb, instance } = createSourceNode(config.client);

  const push: FirebaseStack.Push = (options) => {
    return pushFn(instance, options);
  };

  const stack: FirebaseStack.Instance = {
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
    client: {},
  };

  return { ...defaultConfig, ...customConfig };
}

const pushFn: SourceNode.PrependInstance<FirebaseStack.Push> = (
  instance,
  options = {},
) => {
  return onRequest(options, async (req, res) => {
    // ATTENTION! Never process unknown data from the client

    // @TODO add a custom response handler
    // @TODO move validation to the client
    await tryCatchAsync(
      async (body: string, config: SourceNode.Config) => {
        const event = validateEvent(JSON.parse(body), config.contracts);

        // @TODO what if it's a command?
        if (event.entity === 'walker') return res.send({ status: 'bad boy' });

        const result = await instance.push(event);

        res.send({
          status: result.status,
          successful: result.successful.length,
          failed: result.failed.length,
          queued: result.queued.length,
        });
      },
      (error) => {
        // Error handling

        error = String(error);
        // eslint-disable-next-line no-console
        const onError = instance.config.onError || console.error;
        onError({ error, body: req.body });

        // @TODO add a dead letter queue

        res.status(418).send({ error });
      },
    )(req.body, instance.config);
  });
};
