import type {
  PushFn,
  Settings,
  RuntimeState,
  CustomerIoTrackClientMock,
  CustomerIoApiClientMock,
} from './types';
import { getMappingValue, isObject, isString, StepError } from '@walkeros/core';

/**
 * One call to the SDK, awaited. A failure becomes a StepError with a fixed
 * message: the SDK's own error stays on `cause`, never in the message.
 */
async function sdk(
  message: string,
  call: () => Promise<unknown>,
): Promise<void> {
  try {
    await call();
  } catch (error) {
    throw new StepError(message, {
      code: 'transport',
      status: statusOf(error),
      cause: error,
    });
  }
}

/** The HTTP status of a rejected request (CustomerIORequestError), when known. */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  return 'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode > 0
    ? error.statusCode
    : undefined;
}

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env },
) {
  const settings = config.settings!;
  const envTyped = env as
    | {
        trackClient?: CustomerIoTrackClientMock;
        apiClient?: CustomerIoApiClientMock;
      }
    | undefined;
  const trackClient = envTyped?.trackClient || settings._trackClient;
  const apiClient = envTyped?.apiClient || settings._apiClient;

  if (!trackClient)
    throw new StepError('Customer.io TrackClient not initialized', {
      code: 'not-ready',
    });

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

  if (!customerId && !anonymousId)
    throw new StepError('Customer.io requires customerId or anonymousId', {
      code: 'missing-input',
    });

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
        await sdk('Customer.io trackPageView failed', () =>
          trackClient.trackPageView(customerId, url, pageData),
        );
      }
    }
  }

  // 4. Destroy / Suppress / Unsuppress
  if (mappingSettings.destroy === true && customerId) {
    await sdk('Customer.io destroy failed', () =>
      trackClient.destroy(customerId),
    );
  }
  if (mappingSettings.suppress === true && customerId) {
    await sdk('Customer.io suppress failed', () =>
      trackClient.suppress(customerId),
    );
  }
  if (mappingSettings.unsuppress === true && customerId) {
    await sdk('Customer.io unsuppress failed', () =>
      trackClient.unsuppress(customerId),
    );
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
      const { deviceId, platform } = r;
      if (isString(deviceId) && isString(platform)) {
        await sdk('Customer.io addDevice failed', () =>
          trackClient.addDevice(
            customerId,
            deviceId,
            platform,
            isObject(r.data) ? r.data : undefined,
          ),
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
      const { deviceId, platform } = r;
      if (isString(deviceId) && isString(platform)) {
        await sdk('Customer.io deleteDevice failed', () =>
          trackClient.deleteDevice(customerId, deviceId, platform),
        );
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
      const { primaryType, primaryId, secondaryType, secondaryId } = r;
      if (
        isString(primaryType) &&
        isString(primaryId) &&
        isString(secondaryType) &&
        isString(secondaryId)
      ) {
        await sdk('Customer.io mergeCustomers failed', () =>
          trackClient.mergeCustomers(
            primaryType,
            primaryId,
            secondaryType,
            secondaryId,
          ),
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
      await sdk('Customer.io sendEmail failed', () =>
        apiClient.sendEmail(resolved),
      );
    }
  }
  if (mappingSettings.sendPush !== undefined && apiClient) {
    const resolved = await getMappingValue(event, mappingSettings.sendPush, {
      collector,
    });
    if (isObject(resolved)) {
      await sdk('Customer.io sendPush failed', () =>
        apiClient.sendPush(resolved),
      );
    }
  }

  // 8. Track (unless silent: true)
  if (rule?.silent !== true) {
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
      await sdk('Customer.io track failed', () =>
        trackClient.track(customerId, eventData),
      );
    } else if (anonymousId) {
      await sdk('Customer.io trackAnonymous failed', () =>
        trackClient.trackAnonymous(anonymousId, eventData),
      );
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

  await sdk('Customer.io identify failed', () =>
    trackClient.identify(customerId, resolved),
  );

  state.lastIdentity = {
    customerId,
    attributesHash,
  };
}
