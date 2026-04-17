import type {
  PushFn,
  Settings,
  RuntimeState,
  KlaviyoEventsApiMock,
  KlaviyoProfilesApiMock,
} from './types';
import { getMappingValue, isObject, isString, isArray } from '@walkeros/core';

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger },
) {
  const settings = config.settings as Settings;

  // Resolve SDK instances: prefer env mocks (testing), fall back to real
  const envTyped = env as
    | {
        eventsApi?: KlaviyoEventsApiMock;
        profilesApi?: KlaviyoProfilesApiMock;
      }
    | undefined;
  const eventsApi = envTyped?.eventsApi || settings._eventsApi;
  const profilesApi = envTyped?.profilesApi || settings._profilesApi;

  if (!eventsApi || !profilesApi) {
    logger.warn('Klaviyo API instances not initialized');
    return;
  }

  const state: RuntimeState = settings._state || {};
  const mappingSettings = rule?.settings || {};
  const timestamp = new Date(event.timestamp || Date.now());

  // 1. Resolve identity from event
  const email = settings.email
    ? resolveString(await getMappingValue(event, settings.email, { collector }))
    : undefined;
  const externalId = settings.externalId
    ? resolveString(
        await getMappingValue(event, settings.externalId, { collector }),
      )
    : undefined;
  const phoneNumber = settings.phoneNumber
    ? resolveString(
        await getMappingValue(event, settings.phoneNumber, { collector }),
      )
    : undefined;

  if (!email && !externalId && !phoneNumber) {
    logger.warn(
      'Klaviyo requires at least one profile identifier; skipping event',
      { event: event.name },
    );
    return;
  }

  // Build profile identifier object
  const profileIdentifiers: Record<string, string> = {};
  if (email) profileIdentifiers.email = email;
  if (externalId) profileIdentifiers.externalId = externalId;
  if (phoneNumber) profileIdentifiers.phoneNumber = phoneNumber;

  // 2. Identify -- rule-level overrides destination-level
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      await applyIdentify(
        profilesApi,
        resolved as Record<string, unknown>,
        profileIdentifiers,
        state,
      );
    }
  }

  // 3. Track event (unless skip: true)
  if (rule?.skip !== true) {
    const eventName = isString(rule?.name) ? rule.name : event.name;
    const properties = isObject(data)
      ? { ...(data as Record<string, unknown>) }
      : {};

    // Handle revenue value
    let valueCurrency: string | undefined;
    if (mappingSettings.value !== undefined) {
      const resolvedValue = await getMappingValue(
        event,
        mappingSettings.value,
        {
          collector,
        },
      );
      const numericValue = toNumber(resolvedValue);
      if (numericValue !== undefined) {
        properties.value = numericValue;
        if (settings.currency) {
          valueCurrency = settings.currency;
        }
      }
    }

    const eventBody: Record<string, unknown> = {
      data: {
        type: 'event',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              attributes: { ...profileIdentifiers },
            },
          },
          metric: {
            data: {
              type: 'metric',
              attributes: { name: eventName },
            },
          },
          properties,
          time: timestamp.toISOString(),
          ...(valueCurrency ? { valueCurrency } : {}),
        },
      },
    };

    await eventsApi.createEvent(eventBody);
  }

  settings._state = state;
};

function resolveString(value: unknown): string | undefined {
  if (isString(value) && value.length > 0) return value;
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (isString(value)) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
}

function hashTraits(traits: Record<string, unknown> | undefined): string {
  if (!traits) return '';
  try {
    return JSON.stringify(traits);
  } catch {
    return '';
  }
}

async function applyIdentify(
  profilesApi: KlaviyoProfilesApiMock,
  resolved: Record<string, unknown>,
  profileIdentifiers: Record<string, string>,
  state: RuntimeState,
): Promise<void> {
  const last = state.lastIdentity || {};

  // Build traits hash from resolved attributes for dedup
  const traitsHash = hashTraits(resolved);
  const identityChanged =
    profileIdentifiers.email !== last.email ||
    profileIdentifiers.externalId !== last.externalId ||
    profileIdentifiers.phoneNumber !== last.phoneNumber;
  const traitsChanged = traitsHash !== (last.traitsHash ?? '');

  if (!identityChanged && !traitsChanged) return;

  // Build profile attributes from resolved mapping
  const attributes: Record<string, unknown> = {
    ...profileIdentifiers,
  };

  // Standard Klaviyo profile attributes
  const standardAttrs = [
    'firstName',
    'lastName',
    'organization',
    'title',
    'image',
    'location',
  ];
  for (const attr of standardAttrs) {
    if (resolved[attr] !== undefined) {
      attributes[attr] = resolved[attr];
    }
  }

  // Custom properties
  if (isObject(resolved.properties) && !isArray(resolved.properties)) {
    attributes.properties = resolved.properties;
  }

  const body: Record<string, unknown> = {
    data: {
      type: 'profile',
      attributes,
    },
  };

  await profilesApi.createOrUpdateProfile(body);

  state.lastIdentity = {
    email: profileIdentifiers.email,
    externalId: profileIdentifiers.externalId,
    phoneNumber: profileIdentifiers.phoneNumber,
    traitsHash,
  };
}
