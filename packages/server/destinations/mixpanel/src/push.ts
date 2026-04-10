import type { MixpanelCallback, MixpanelClient, PushFn } from './types';
import { getMappingValue, isArray, isObject, isString } from '@walkeros/core';

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
function wrapCallback(fn: (cb: MixpanelCallback) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fn((err) => {
      if (err) reject(err);
      else resolve();
    });
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
      wrapCallback((cb) => {
        (
          client.people[op] as (
            id: string,
            props: Record<string, unknown>,
            cb: MixpanelCallback,
          ) => void
        )(distinctId, bag as Record<string, unknown>, cb);
      }),
    );
  }

  // Handle unset — string or string[]
  const unsetVal = resolved.unset;
  if (unsetVal !== undefined) {
    if (isString(unsetVal)) {
      promises.push(
        wrapCallback((cb) => {
          client.people.unset(distinctId, unsetVal, cb);
        }),
      );
    } else if (isArray(unsetVal)) {
      const names = (unsetVal as unknown[]).filter((v): v is string =>
        isString(v),
      );
      if (names.length > 0) {
        promises.push(
          wrapCallback((cb) => {
            client.people.unset(distinctId, names, cb);
          }),
        );
      }
    }
  }

  // Handle delete_user
  if (resolved.delete_user === true) {
    promises.push(
      wrapCallback((cb) => {
        client.people.delete_user(distinctId, cb);
      }),
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
): Promise<void> {
  const { key, id } = resolved as { key?: unknown; id?: unknown };
  if (!isString(key) || key === '' || !isString(id) || id === '') return;

  const promises: Promise<void>[] = [];

  for (const op of GROUP_OBJECT_OPS) {
    const bag = resolved[op];
    if (!isObject(bag) || Object.keys(bag).length === 0) continue;
    promises.push(
      wrapCallback((cb) => {
        (
          client.groups[op] as (
            gk: string,
            gi: string,
            props: Record<string, unknown>,
            cb: MixpanelCallback,
          ) => void
        )(key, id, bag as Record<string, unknown>, cb);
      }),
    );
  }

  // Handle unset
  const unsetVal = resolved.unset;
  if (unsetVal !== undefined) {
    if (isString(unsetVal)) {
      promises.push(
        wrapCallback((cb) => {
          client.groups.unset(key, id, unsetVal, cb);
        }),
      );
    } else if (isArray(unsetVal)) {
      const names = (unsetVal as unknown[]).filter((v): v is string =>
        isString(v),
      );
      if (names.length > 0) {
        promises.push(
          wrapCallback((cb) => {
            client.groups.unset(key, id, names, cb);
          }),
        );
      }
    }
  }

  // Handle delete
  if (resolved.delete === true) {
    promises.push(
      wrapCallback((cb) => {
        client.groups.delete_group(key, id, cb);
      }),
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
  if (!client) {
    logger.throw('Mixpanel client not initialized');
    return;
  }

  const mappingSettings = rule?.settings || {};

  // 1. Resolve identity — rule-level override wins over destination-level.
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

  // 2. Alias — fire before people/track (legacy identity merge)
  if (distinctId && alias) {
    await wrapCallback((cb) => {
      client.alias(distinctId!, alias!, cb);
    });
  }

  // 3. People operations — require distinct_id
  if (distinctId && mappingSettings.people !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.people, {
      collector,
    });
    if (isObject(resolved)) {
      await applyPeople(
        client,
        distinctId,
        resolved as Record<string, unknown>,
      );
    }
  }

  // 4. Group — attach group keys to event properties
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
      await applyGroupProfile(client, resolved as Record<string, unknown>);
    }
  }

  // 6. Track/Import — unless the rule opts out via skip
  if (rule?.skip !== true) {
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
      await wrapCallback((cb) => {
        client.import(eventName, timestamp, properties, cb);
      });
    } else {
      await wrapCallback((cb) => {
        client.track(eventName, properties, cb);
      });
    }
  }
};
