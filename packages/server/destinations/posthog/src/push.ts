import type { PushFn } from './types';
import { getMappingValue, isObject, isString } from '@walkeros/core';

export const push: PushFn = async function (
  event,
  { config, rule, data, collector },
) {
  const settings = config.settings!;
  const client = settings.client;
  if (!client) return;

  const mappingSettings = (rule?.settings || {}) as Record<string, unknown>;

  // Resolve distinctId: rule-level identify wins over destination-level
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  let distinctId: string | undefined;
  let identifyResolved: Record<string, unknown> | undefined;

  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      identifyResolved = resolved as Record<string, unknown>;
      if (isString(identifyResolved.distinctId)) {
        distinctId = identifyResolved.distinctId as string;
      }
    }
  }

  // Fallback distinctId from event.user
  if (!distinctId) {
    distinctId =
      (isString(event.user?.id) ? event.user.id : undefined) ||
      (isString(event.user?.hash) ? event.user.hash : undefined) ||
      (isString(event.user?.session) ? event.user.session : undefined) ||
      'anonymous';
  }

  // 1. Identity — if $set or $set_once present, call client.identify()
  if (identifyResolved) {
    const $set = isObject(identifyResolved.$set)
      ? (identifyResolved.$set as Record<string, unknown>)
      : undefined;
    const $setOnce = isObject(identifyResolved.$set_once)
      ? (identifyResolved.$set_once as Record<string, unknown>)
      : undefined;

    if ($set || $setOnce) {
      const properties: Record<string, unknown> = {};
      if ($set) properties.$set = $set;
      if ($setOnce) properties.$set_once = $setOnce;
      client.identify({ distinctId, properties });
    }
  }

  // 2. Group — resolve group mapping (rule-level wins)
  const groupMapping = mappingSettings.group ?? settings.group;
  let groups: Record<string, string | number> | undefined;

  if (groupMapping !== undefined) {
    const resolved = await getMappingValue(event, groupMapping, {
      collector,
    });
    if (isObject(resolved)) {
      const groupResolved = resolved as Record<string, unknown>;
      const type = groupResolved.type;
      const key = groupResolved.key;
      const properties = isObject(groupResolved.properties)
        ? (groupResolved.properties as Record<string, unknown>)
        : undefined;

      if (isString(type) && (isString(key) || typeof key === 'number')) {
        // If properties present, call groupIdentify
        if (properties) {
          client.groupIdentify({
            groupType: type,
            groupKey: String(key),
            properties,
          });
        }
        // Build groups object for capture
        groups = { [type]: key as string | number };
      }
    }
  }

  // 3. Capture — unless rule opts out via skip
  if (rule?.skip !== true) {
    const eventName = isString(rule?.name) ? rule.name : event.name;
    const properties = isObject(data) ? (data as Record<string, unknown>) : {};

    const captureArgs: Record<string, unknown> = {
      distinctId,
      event: eventName,
      properties,
    };
    if (groups) captureArgs.groups = groups;

    client.capture(captureArgs as Parameters<typeof client.capture>[0]);
  }
};
