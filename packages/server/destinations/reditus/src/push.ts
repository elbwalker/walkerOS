import type { CallType, ConversionBody, PaymentBody, PushFn } from './types';
import type { WalkerOS } from '@walkeros/core';
import { isObject, StepError } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';

const DEFAULT_URL = 'https://api.getreditus.com/api';

interface Call {
  path: string;
  body: ConversionBody | PaymentBody;
  /** HTTP status that means Reditus already has, or will never have, it */
  accept: number;
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

function inputError(message: string): StepError {
  return new StepError(message, { code: 'mapping', retryable: false });
}

function conversionCall(data: Record<string, unknown>): Call {
  const body: ConversionBody = withoutUndefined({
    affiliate_slug: text(data.affiliate_slug),
    advocate_slug: text(data.advocate_slug),
    email: text(data.email),
    uid: text(data.uid),
    gr_id: text(data.gr_id),
  });
  if (!body.email && !body.uid)
    throw inputError('Reditus conversion needs email or uid');
  if (!body.gr_id && !body.affiliate_slug && !body.advocate_slug)
    throw inputError(
      'Reditus conversion needs gr_id, affiliate_slug or advocate_slug',
    );
  // 409: the referral already exists.
  return { path: '/v2/tracking/conversion', body, accept: 409 };
}

function paymentCall(
  event: WalkerOS.Event,
  data: Record<string, unknown>,
): Call {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw inputError('Reditus payment needs a positive amount');
  const { interval, interval_count } = data;
  const body: PaymentBody = withoutUndefined({
    idempotency_key: text(data.idempotency_key) ?? String(event.id),
    amount: Math.round(amount * 100),
    currency: (text(data.currency) ?? 'eur').toLowerCase(),
    referral_uid: text(data.uid),
    referral_email: text(data.email),
    subscription_id: text(data.subscription_id),
    interval:
      interval === 'month' || interval === 'year' ? interval : undefined,
    interval_count:
      typeof interval_count === 'number' && Number.isInteger(interval_count)
        ? interval_count
        : undefined,
  });
  if (!body.referral_uid && !body.referral_email)
    throw inputError('Reditus payment needs uid or email');
  // 404: no referral for this customer, nothing to credit.
  return { path: '/v1/payments', body, accept: 404 };
}

// A silent rule has no Reditus call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, data, rule, env, logger },
) {
  const {
    apiKey,
    type: defaultType,
    url = DEFAULT_URL,
  } = config.settings ?? {};
  if (!apiKey)
    throw new StepError('Reditus settings missing, init() not run', {
      code: 'not-ready',
    });

  const type: CallType = rule?.settings?.type ?? defaultType ?? 'conversion';
  const mapped = isObject(data) ? data : {};
  const call =
    type === 'payment' ? paymentCall(event, mapped) : conversionCall(mapped);
  const endpoint = `${url.replace(/\/$/, '')}${call.path}`;

  logger.debug('Calling Reditus API', {
    endpoint,
    method: 'POST',
    type,
    eventId: event.id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  try {
    await sendServerFn(endpoint, JSON.stringify(call.body), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof StepError && error.status === call.accept) {
      logger.debug('Reditus already has this, skipped', {
        status: error.status,
        eventId: event.id,
      });
      return;
    }
    throw error;
  }
};
