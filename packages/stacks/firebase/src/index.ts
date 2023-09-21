import type { FirebaseStack } from './types';
import { onRequest } from 'firebase-functions/v2/https';

// Types
export * from './types';

export function createFirebaseStack(
  customConfig?: FirebaseStack.PartialConfig,
) {
  const instance = firebaseStack(customConfig);
  const entry = instance.entry;

  return { entry, instance };
}

export function firebaseStack(
  customConfig: FirebaseStack.PartialConfig = {},
): FirebaseStack.Function {
  const config = getConfig(customConfig);

  const entry: FirebaseStack.Entry = (...args) => {
    return entryFn(instance, ...args);
  };

  const instance: FirebaseStack.Function = {
    config,
    entry,
  };

  return instance;
}

function getConfig(
  customConfig: FirebaseStack.PartialConfig = {},
): FirebaseStack.Config {
  const defaultConfig: FirebaseStack.Config = {
    firebase: {},
  };

  return { ...defaultConfig, ...customConfig };
}

const entryFn: FirebaseStack.PrependInstance<FirebaseStack.Entry> = (
  instance,
  options = {},
) => {
  return onRequest(options, (req, res) => {
    // @TODO do something
    res.status(200).send({ params: req.params, instance });
  });
};
