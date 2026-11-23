import type { CallType, ConversionBody, PaymentBody, PushFn } from './types';
import { isObject, reportCause, StepError, stepId } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';

const DEFAULT_URL = 'https://api.getreditus.com/api';

interface Call {
  path: string;
  body: ConversionBody | PaymentBody;
}

/**
 * A Reditus answer outside 2xx that is not a failure. It is told apart by
 * the body Reditus documents for it, never by the status alone: a wrong
 * `url` or a proxy answers the same status with another body.
 */
interface Accepted {
  type: CallType;
  status: number;
  matches: (body: unknown) => boolean;
  /** Why nothing new was recorded, for the log line. */
  skipped: string;
  /** Reported as a cause at warn: the same answer can hide a mapping mistake. */
  cause?: string;
}

/** The `details` of each entry of a `{ errors: [{ title, details }] }` body. */
function errorDetails(body: unknown): unknown[] {
  if (!isObject(body) || !Array.isArray(body.errors)) return [];
  return body.errors.map((entry: unknown) =>
    isObject(entry) ? entry.details : undefined,
  );
}

const ACCEPTED: Accepted[] = [
  {
    type: 'conversion',
    status: 409,
    matches: (body) =>
      isObject(body) && body.error === 'Referral already exists',
    skipped: 'referral already exists',
  },
  {
    type: 'payment',
    status: 400,
    matches: (body) =>
      errorDetails(body).some(
        (details) =>
          isObject(details) &&
          Array.isArray(details.idempotency_key) &&
          details.idempotency_key.includes('has already been taken'),
      ),
    skipped: 'idempotency_key already taken',
  },
  {
    type: 'payment',
    status: 404,
    matches: (body) => errorDetails(body).includes('Referral not found'),
    skipped:
      'referral not found (a customer who was never referred, or uid or email mapped from the wrong field)',
    cause: 'not-referred',
  },
];

/** The accepted answer a failed request got, if it is one. */
function acceptedAnswer(type: CallType, error: unknown): Accepted | undefined {
  if (!(error instanceof StepError)) return undefined;
  const { status, body } = error;
  return ACCEPTED.find(
    (answer) =>
      answer.type === type && answer.status === status && answer.matches(body),
  );
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

function inputError(message: string): StepError {
  return new StepError(message, { code: 'missing-input' });
}

function conversionCall(data: Record<string, unknown>): Call {
  const body: ConversionBody = {
    affiliate_slug: text(data.affiliate_slug),
    advocate_slug: text(data.advocate_slug),
    email: text(data.email),
    uid: text(data.uid),
    gr_id: text(data.gr_id),
  };
  if (!body.email && !body.uid)
    throw inputError('Reditus conversion needs email or uid');
  if (!body.affiliate_slug && !body.advocate_slug)
    throw inputError(
      'Reditus conversion needs affiliate_slug or advocate_slug',
    );
  return { path: '/v2/tracking/conversion', body };
}

function paymentCall(data: Record<string, unknown>): Call {
  const referral_uid = text(data.uid);
  const referral_email = text(data.email);
  const idempotency_key = text(data.idempotency_key);
  const currency = text(data.currency);
  const { amount, interval, interval_count } = data;
  if (!referral_uid && !referral_email)
    throw inputError('Reditus payment needs uid or email');
  if (!idempotency_key)
    throw inputError('Reditus payment needs idempotency_key');
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0)
    throw inputError(
      'Reditus payment needs amount as a positive integer in minor units',
    );
  if (!currency) throw inputError('Reditus payment needs currency');
  const body: PaymentBody = {
    idempotency_key,
    amount,
    currency: currency.toLowerCase(),
    referral_uid,
    referral_email,
    subscription_id: text(data.subscription_id),
    interval:
      interval === 'month' || interval === 'year' ? interval : undefined,
    interval_count:
      typeof interval_count === 'number' && Number.isInteger(interval_count)
        ? interval_count
        : undefined,
  };
  return { path: '/v1/payments', body };
}

// A silent rule has no Reditus call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, data, rule, env, logger, collector, id },
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
    type === 'payment' ? paymentCall(mapped) : conversionCall(mapped);
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
    const accepted = acceptedAnswer(type, error);
    if (!accepted) throw error;
    const message = `Reditus skipped ${type}: ${accepted.skipped}`;
    if (accepted.cause)
      reportCause(
        collector,
        logger,
        {
          step: stepId('destination', id),
          code: accepted.cause,
          status: accepted.status,
        },
        message,
        { event: event.name },
        'warn',
      );
    else logger.debug(message, { status: accepted.status, eventId: event.id });
  }
};
