import type { MixpanelCallback, MixpanelClient, PushFn } from './types';
import {
  getMappingValue,
  isArray,
  isObject,
  isString,
  isThenable,
  StepError,
} from '@walkeros/core';

type PeopleObjectOp =
  | 'set'
  | 'set_once'
  | 'increment'
  | 'append'
  | 'union'
  | 'remove';

const PEOPLE_OBJECT_OPS: PeopleObjectOp[] = [
  'set',
  'set_once',
  'increment',
  'append',
  'union',
  'remove',
];

type GroupObjectOp = 'set' | 'set_once' | 'union' | 'remove';

const GROUP_OBJECT_OPS: GroupObjectOp[] = [
  'set',
  'set_once',
  'union',
  'remove',
];

/**
 * Wraps a Mixpanel SDK callback-based call in a Promise.
 */
function wrapCallback(fn: (cb: MixpanelCallback) => unknown): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // The SDK's own error stays on `cause`, never in the message.
    const fail = (error: unknown) =>
      reject(
        new StepError('Mixpanel request failed', {
          code: 'transport',
          cause: error,
        }),
      );
    try {
      const answer = fn((err) => (err ? fail(err) : resolve()));
      // An injected client may answer with a promise instead of the callback.
      if (isThenable(answer)) answer.then(() => resolve(), fail);
    } catch (error) {
      fail(error);
    }
  });
}

/**
 * Apply people operations to the Mixpanel client.
 * All people methods require distinct_id as the first argument.
 */
async function applyPeople(
  client: MixpanelClient,
  distinctId: string,
  resolved: Record<string, unknown>,
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const op of PEOPLE_OBJECT_OPS) {
    const bag = resolved[op];
    if (!isObject(bag) || Object.keys(bag).length === 0) continue;
    promises.push(
      wrapCallback((cb) =>
        (
          client.people[op] as (
            id: string,
            props: Record<string, unknown>,
            cb: MixpanelCallback,
          ) => void
        )(distinctId, bag, cb),
      ),
    );
  }

  // Handle unset - string or string[]
  const unsetVal = resolved.unset;
  if (unsetVal !== undefined) {
    if (isString(unsetVal)) {
      promises.push(
        wrapCallback((cb) => client.people.unset(distinctId, unsetVal, cb)),
      );
    } else if (isArray(unsetVal)) {
      const names = (unsetVal as unknown[]).filter((v): v is string =>
        isString(v),
      );
      if (names.length > 0) {
        promises.push(
          wrapCallback((cb) => client.people.unset(distinctId, names, cb)),
        );
      }
    }
  }

  // Handle delete_user
  if (resolved.delete_user === true) {
    promises.push(
      wrapCallback((cb) => client.people.delete_user(distinctId, cb)),
    );
  }

  await Promise.all(promises);
}

/**
 * Apply group profile operations to the Mixpanel client.
 */
async function applyGroupProfile(
  client: MixpanelClient,
  resolved: Record<string, unknown>,
  dropped: () => void,
): Promise<void> {
  const { key, id } = resolved as { key?: unknown; id?: unknown };
  if (!isString(key) || key === '' || !isString(id) || id === '') {
    dropped();
    return;
  }

  const promises: Promise<void>[] = [];

  for (const op of GROUP_OBJECT_OPS) {
    const bag = resolved[op];
    if (!isObject(bag) || Object.keys(bag).length === 0) continue;
    promises.push(
      wrapCallback((cb) =>
        (
          client.groups[op] as (
            gk: string,
            gi: string,
            props: Record<string, unknown>,
            cb: MixpanelCallback,
          ) => void
        )(key, id, bag, cb),
      ),
    );
  }

  // Handle unset
  const unsetVal = resolved.unset;
  if (unsetVal !== undefined) {
    if (isString(unsetVal)) {
      promises.push(
        wrapCallback((cb) => client.groups.unset(key, id, unsetVal, cb)),
      );
    } else if (isArray(unsetVal)) {
      const names = (unsetVal as unknown[]).filter((v): v is string =>
        isString(v),
      );
      if (names.length > 0) {
        promises.push(
          wrapCallback((cb) => client.groups.unset(key, id, names, cb)),
        );
      }
    }
  }

  // Handle delete
  if (resolved.delete === true) {
    promises.push(
      wrapCallback((cb) => client.groups.delete_group(key, id, cb)),
    );
  }

  await Promise.all(promises);
}

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, logger },
) {
  const settings = config.settings!;
  const client = settings.client;
  if (!client)
    throw new StepError('Mixpanel client not initialized', {
      code: 'not-ready',
    });

  const mappingSettings = rule?.settings || {};

  // 1. Resolve identity - rule-level override wins over destination-level.
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  let distinctId: string | undefined;
  let alias: string | undefined;

  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      const r = resolved as Record<string, unknown>;
      if (isString(r.distinctId) && r.distinctId !== '') {
        distinctId = r.distinctId;
      }
      if (isString(r.alias) && r.alias !== '') {
        alias = r.alias;
      }
    }
  }

  // 2. Alias - fire before people/track (legacy identity merge)
  if (distinctId && alias) {
    await wrapCallback((cb) => client.alias(distinctId!, alias!, cb));
  }

  // 3. People operations - require distinct_id
  if (mappingSettings.people !== undefined) {
    const resolved = distinctId
      ? await getMappingValue(event, mappingSettings.people, { collector })
      : undefined;
    if (distinctId && isObject(resolved)) {
      await applyPeople(
        client,
        distinctId,
        resolved as Record<string, unknown>,
      );
    } else {
      // Nothing to address: a deliberate skip, named by its mapping key.
      logger.debug('Mixpanel skipped people: identify resolved to nothing', {
        event: event.name,
        mappingKey: distinctId ? 'people' : 'identify',
      });
    }
  }

  // 4. Group - attach group keys to event properties
  let groupProps: Record<string, unknown> = {};
  const groupMapping = mappingSettings.group ?? settings.group;
  if (groupMapping !== undefined) {
    const resolved = await getMappingValue(event, groupMapping, { collector });
    if (isObject(resolved)) {
      const { key: gKey, id: gId } = resolved as {
        key?: unknown;
        id?: unknown;
      };
      if (isString(gKey) && gKey !== '' && isString(gId) && gId !== '') {
        groupProps = { [gKey]: gId };
      }
    }
  }

  // 5. Group profile operations
  if (mappingSettings.groupProfile !== undefined) {
    const resolved = await getMappingValue(
      event,
      mappingSettings.groupProfile,
      {
        collector,
      },
    );
    if (isObject(resolved)) {
      // A group profile without key and id has nothing to address: the event
      // still goes out, and the skip is a deliberate decision (DEBUG).
      await applyGroupProfile(client, resolved, () =>
        logger.debug(
          'Mixpanel skipped groupProfile: groupProfile resolved to nothing',
          { event: event.name, mappingKey: 'groupProfile' },
        ),
      );
    }
  }

  // 6. Track/Import - unless the rule opts out via silent
  if (rule?.silent !== true) {
    const eventName = isString(rule?.name) ? rule.name : event.name;
    const properties: Record<string, unknown> = {};

    // Add distinct_id to properties
    if (distinctId) {
      properties.distinct_id = distinctId;
    }

    // Add group properties
    Object.assign(properties, groupProps);

    // Add mapped data (from collector/rule resolution)
    if (isObject(data)) {
      Object.assign(properties, data as Record<string, unknown>);
    }

    // Determine if we should use import or track
    const useImport = settings.useImport || mappingSettings.useImport;

    if (useImport) {
      const timestamp = event.timestamp || Date.now();
      await wrapCallback((cb) =>
        client.import(eventName, timestamp, properties, cb),
      );
    } else {
      await wrapCallback((cb) => client.track(eventName, properties, cb));
    }
  }
};
