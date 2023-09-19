import type { FirebaseStack } from './types';

// Types
export * from './types';

export function firebaseStack(
  customConfig: FirebaseStack.PartialConfig = {},
): FirebaseStack.Function {
  const config = getConfig(customConfig);

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

const entry: FirebaseStack.Entry = async (event) => {
  console.log('event', event);
  return;
};
