import { StepError } from '@walkeros/core';
import type { Transformer } from '@walkeros/core';

type Types = Transformer.Types<{ salt?: string }>;

/** Hashes the user id with a required salt; a missing id is reported. */
export const hashing: Transformer.Init<Types> = ({ config }) => {
  const salt = config.settings?.salt;
  if (!salt)
    throw new StepError('Config settings salt missing', { code: 'config' });
  return {
    type: 'hashing',
    config,
    push: (event) => {
      const id = event.user?.id;
      if (!id)
        throw new StepError('Event has no user id to hash', {
          code: 'missing-input',
        });
      return {
        event: {
          ...event,
          user: { ...event.user, hash: `${salt}:${id.length}` },
        },
      };
    },
  };
};

/** Drops an event without a user id: the drop is silent (item 10). */
export const dropping: Transformer.Init<Types> = async (context) => {
  const instance = await hashing(context);
  return {
    ...instance,
    push: (event, pushContext) =>
      event.user?.id ? instance.push(event, pushContext) : false,
  };
};
