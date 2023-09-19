import type { FirebaseStack } from './types';

// Types
export * from './types';

export function firebaseStack(): FirebaseStack.Function {
  const instance: FirebaseStack.Function = {
    entry,
  };

  return instance;
}

const entry: FirebaseStack.Entry = async (event) => {
  console.log('event', event);
  return;
};
