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

type EnvTypes = Transformer.Types<unknown, { prefix?: string }>;

/** Needs `env.prefix` in its factory, its init and its push. */
export const envReading: Transformer.Init<EnvTypes> = ({ config, env }) => {
  if (!env.prefix)
    throw new StepError('Env prefix missing in the factory', {
      code: 'config',
    });
  return {
    type: 'env-reading',
    config,
    init: ({ env: initEnv }) => {
      if (!initEnv.prefix)
        throw new StepError('Env prefix missing in init', { code: 'config' });
    },
    push: (event, { env: pushEnv }) => {
      if (!pushEnv.prefix)
        throw new StepError('Env prefix missing in push', {
          code: 'missing-input',
        });
      return { event };
    },
  };
};

type IngestTypes = Transformer.Types<unknown>;

/** Decodes the request in the ingest; an event without one is missing-input. */
export const ingestDecoding: Transformer.Init<IngestTypes> = ({ config }) => ({
  type: 'ingest-decoding',
  config,
  push: (event, { ingest }) => {
    if (typeof ingest.url !== 'string')
      throw new StepError('No request in the ingest', {
        code: 'missing-input',
      });
    return { event: { ...event, name: 'page view' } };
  },
});

/** Passes an event on unchanged when the ingest has no request (silent). */
export const ingestPassing: Transformer.Init<IngestTypes> = ({ config }) => ({
  type: 'ingest-passing',
  config,
  push: (event, { ingest }) =>
    typeof ingest.url === 'string'
      ? { event: { ...event, name: 'page view' } }
      : { event },
});
