import type {
  PushFn,
  Settings,
  RuntimeState,
  CustomerIoTrackClientMock,
  CustomerIoApiClientMock,
} from './types';
import { getMappingValue, isObject, isString } from '@walkeros/core';

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger },
) {
  const settings = config.settings as Settings;
  const envTyped = env as
    | {
        trackClient?: CustomerIoTrackClientMock;
        apiClient?: CustomerIoApiClientMock;
      }
    | undefined;
  const trackClient = envTyped?.trackClient || settings._trackClient;
  const apiClient = envTyped?.apiClient || settings._apiClient;

  if (!trackClient) {
    logger.warn('Customer.io TrackClient not initialized');
    return;
  }

  const state: RuntimeState = settings._state || {};
  const mappingSettings = rule?.settings || {};

  // Convert ms timestamp to Unix seconds
  const timestampSec = event.timestamp
    ? Math.floor(event.timestamp / 1000)
    : undefined;

  // 1. Resolve identity from event
  const customerId = settings.customerId
    ? resolveString(
        await getMappingValue(event, settings.customerId, { collector }),
      )
    : undefined;
  const anonymousId = settings.anonymousId
    ? resolveString(
        await getMappingValue(event, settings.anonymousId, { collector }),
      )
    : undefined;

  if (!customerId && !anonymousId) {
    logger.warn(
      'Customer.io requires customerId or anonymousId; skipping event',
      { event: event.name },
    );
    return;
  }

  // 2. Identify -- rule-level overrides destination-level
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  if (identifyMapping !== undefined && customerId) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      await applyIdentify(
        trackClient,
        customerId,
        resolved as Record<string, unknown>,
        state,
      );
    }
  }

  // 3. Page (trackPageView)
  if (mappingSettings.page !== undefined && customerId) {
    const resolved = await getMappingValue(event, mappingSettings.page, {
      collector,
    });
    if (isObject(resolved)) {
      const r = resolved as { url?: unknown; [key: string]: unknown };
      const url = isString(r.url) ? r.url : undefined;
      if (url) {
        const { url: _u, ...extraData } = r;
        void _u;
        const pageData =
          Object.keys(extraData).length > 0 ? extraData : undefined;
        await trackClient.trackPageView(customerId, url, pageData);
      }
    }
  }

  // 4. Destroy / Suppress / Unsuppress
  if (mappingSettings.destroy === true && customerId) {
    await trackClient.destroy(customerId);
  }
  if (mappingSettings.suppress === true && customerId) {
    await trackClient.suppress(customerId);
  }
  if (mappingSettings.unsuppress === true && customerId) {
    await trackClient.unsuppress(customerId);
  }

  // 5. Device management
  if (mappingSettings.addDevice !== undefined && customerId) {
    const resolved = await getMappingValue(event, mappingSettings.addDevice, {
      collector,
    });
    if (isObject(resolved)) {
      const r = resolved as {
        deviceId?: unknown;
        platform?: unknown;
        data?: unknown;
      };
      if (isString(r.deviceId) && isString(r.platform)) {
        await trackClient.addDevice(
          customerId,
          r.deviceId,
          r.platform,
          isObject(r.data) ? (r.data as Record<string, unknown>) : undefined,
        );
      }
    }
  }
  if (mappingSettings.deleteDevice !== undefined && customerId) {
    const resolved = await getMappingValue(
      event,
      mappingSettings.deleteDevice,
      { collector },
    );
    if (isObject(resolved)) {
      const r = resolved as { deviceId?: unknown; platform?: unknown };
      if (isString(r.deviceId) && isString(r.platform)) {
        await trackClient.deleteDevice(customerId, r.deviceId, r.platform);
      }
    }
  }

  // 6. Merge
  if (mappingSettings.merge !== undefined && customerId) {
    const resolved = await getMappingValue(event, mappingSettings.merge, {
      collector,
    });
    if (isObject(resolved)) {
      const r = resolved as {
        primaryType?: unknown;
        primaryId?: unknown;
        secondaryType?: unknown;
        secondaryId?: unknown;
      };
      if (
        isString(r.primaryType) &&
        isString(r.primaryId) &&
        isString(r.secondaryType) &&
        isString(r.secondaryId)
      ) {
        await trackClient.mergeCustomers(
          r.primaryType,
          r.primaryId,
          r.secondaryType,
          r.secondaryId,
        );
      }
    }
  }

  // 7. Transactional (sendEmail / sendPush)
  if (mappingSettings.sendEmail !== undefined && apiClient) {
    const resolved = await getMappingValue(event, mappingSettings.sendEmail, {
      collector,
    });
    if (isObject(resolved)) {
      await apiClient.sendEmail(resolved);
    }
  }
  if (mappingSettings.sendPush !== undefined && apiClient) {
    const resolved = await getMappingValue(event, mappingSettings.sendPush, {
      collector,
    });
    if (isObject(resolved)) {
      await apiClient.sendPush(resolved);
    }
  }

  // 8. Track (unless skip: true)
  if (rule?.skip !== true) {
    const eventName = isString(rule?.name) ? rule.name : event.name;
    const properties = isObject(data) ? (data as Record<string, unknown>) : {};

    const eventData: {
      name: string;
      data?: Record<string, unknown>;
      timestamp?: number;
    } = { name: eventName };
    eventData.data = properties;
    if (timestampSec !== undefined) eventData.timestamp = timestampSec;

    if (customerId) {
      await trackClient.track(customerId, eventData);
    } else if (anonymousId) {
      await trackClient.trackAnonymous(anonymousId, eventData);
    }
  }

  settings._state = state;
};

function resolveString(value: unknown): string | undefined {
  if (isString(value) && value.length > 0) return value;
  return undefined;
}

function hashAttributes(attrs: Record<string, unknown> | undefined): string {
  if (!attrs) return '';
  try {
    return JSON.stringify(attrs);
  } catch {
    return '';
  }
}

async function applyIdentify(
  trackClient: CustomerIoTrackClientMock,
  customerId: string,
  resolved: Record<string, unknown>,
  state: RuntimeState,
): Promise<void> {
  const last = state.lastIdentity || {};

  const attributesHash = hashAttributes(resolved);
  const customerIdChanged = customerId !== last.customerId;
  const attributesChanged = attributesHash !== (last.attributesHash ?? '');

  if (!customerIdChanged && !attributesChanged) return;

  await trackClient.identify(customerId, resolved);

  state.lastIdentity = {
    customerId,
    attributesHash,
  };
}
