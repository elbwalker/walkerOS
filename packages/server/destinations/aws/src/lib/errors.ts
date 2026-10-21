import {
  isServerError,
  isThrottlingError,
  isTransientError,
} from '@smithy/core/retry';
import { StepError } from '@walkeros/core';

/** The AWS service a delivery goes to, as it appears in every message. */
export type AwsService = 'Firehose' | 'SNS';

/**
 * What a failure is about: the service, the stream or topic and the region.
 * Every message carries all three, because a wrong region and a wrong name
 * produce the same AWS answer.
 */
export interface DeliveryTarget {
  service: AwsService;
  /** Stream name or topic ARN (or topic name before the ARN is known). */
  resource: string;
  region: string;
  /** Destination id, used by the SNS setup hint. */
  id?: string;
}

/*
 * Every failure this package throws is a `StepError`. `code` is the AWS error
 * name or one of the package's own codes (`RecordTooLarge`, `InvalidRecord`,
 * `InvalidResponse`, `config`), `status` the HTTP status when AWS answered,
 * and `retryable` whether sending the same record again can succeed. The
 * message is the package's own: AWS's text can quote the request, so it stays
 * on the SDK error, kept as `cause`, or on a rejected record's `body`.
 */

/** Codes whose fix is a configuration change, each with that change. */
function hintFor(code: string, target: DeliveryTarget): string | undefined {
  switch (code) {
    case 'ResourceNotFoundException':
      return target.service === 'Firehose'
        ? 'Check settings.streamName and settings.region.'
        : 'Check settings.topicArn and settings.region.';
    case 'AccessDeniedException':
    case 'AuthorizationErrorException':
      return target.service === 'Firehose'
        ? 'Allow firehose:PutRecordBatch on the stream for these credentials.'
        : 'Allow sns:Publish on the topic for these credentials.';
    case 'UnrecognizedClientException':
    case 'InvalidSignatureException':
    case 'ExpiredTokenException':
    case 'CredentialsProviderError':
      return 'Check config.credentials or the AWS credentials in the environment.';
    case 'NotFoundException':
      return target.service === 'SNS'
        ? `Run "walkeros setup destination.${target.id ?? '<id>'}" or set settings.topicArn.`
        : undefined;
    default:
      return undefined;
  }
}

function describe(target: DeliveryTarget): string {
  const kind = target.service === 'Firehose' ? 'stream' : 'topic';
  return `${target.service} ${kind} "${target.resource}" (${target.region})`;
}

/** Builds the message: target, code, the package's detail and, if listed, the fix. */
export function formatMessage(
  target: DeliveryTarget,
  code: string,
  detail?: string,
): string {
  const hint = hintFor(code, target);
  const base = detail
    ? `${describe(target)}: ${code}: ${detail}`
    : `${describe(target)}: ${code}`;
  return hint ? `${base} ${hint}` : base;
}

/** The error shape the SDK classifier reads. */
type SdkError = Parameters<typeof isTransientError>[0];

function isSdkError(error: unknown): error is SdkError {
  return error instanceof Error;
}

function readCode(error: SdkError): string {
  // Network errors from Node arrive as a plain `Error` whose cause is in the
  // errno `code` (ECONNRESET, ETIMEDOUT); the name alone would say nothing.
  if (error.name !== 'Error') return error.name;
  const code: unknown = Reflect.get(error, 'code');
  return typeof code === 'string' && code.length > 0 ? code : error.name;
}

/**
 * Errors of the providers that resolve credentials before a request goes
 * out: a setup problem, never fixed by sending again.
 */
const PROVIDER_ERRORS = [
  'ProviderError',
  'CredentialsProviderError',
  'TokenProviderError',
];

/**
 * Wraps an error a whole call threw. `retryable` is the SDK's own public
 * classifier, the one its standard retry strategy uses, so this package keeps
 * no table of its own. An error it does not know that carries no AWS answer
 * never reached AWS (a refused connection) and is retryable like any
 * transport failure, unless no credentials could be found.
 */
export function fromSdkError(
  error: unknown,
  target: DeliveryTarget,
): StepError {
  if (error instanceof StepError) return error;

  if (!isSdkError(error)) {
    return new StepError(formatMessage(target, 'UnknownError'), {
      code: 'UnknownError',
      retryable: false,
      cause: error,
    });
  }

  const code = readCode(error);
  const status = error.$metadata?.httpStatusCode;
  const retryable =
    isThrottlingError(error) ||
    isTransientError(error) ||
    isServerError(error) ||
    (status === undefined && !PROVIDER_ERRORS.includes(code));

  return new StepError(formatMessage(target, code), {
    code,
    status,
    retryable,
    cause: error,
  });
}

/**
 * A record AWS rejected inside an accepted call. Both per-record codes AWS
 * documents for PutRecordBatch (`ServiceUnavailableException`,
 * `InternalFailure`) are retryable, so every such rejection is. AWS's answer
 * for the record stays on the error as `body`.
 */
export function recordError(
  target: DeliveryTarget,
  code: string,
  status?: number,
  body?: unknown,
): StepError {
  return new StepError(formatMessage(target, code), {
    code,
    status,
    retryable: true,
    body,
  });
}

/**
 * A failure this package detected itself, without an AWS answer to classify:
 * a record it refused to send, or a response it could not read.
 */
export function localError(
  target: DeliveryTarget,
  code: 'RecordTooLarge' | 'InvalidRecord' | 'InvalidResponse',
  detail: string,
  cause?: unknown,
): StepError {
  return new StepError(formatMessage(target, code, detail), {
    code,
    retryable: code === 'InvalidResponse',
    cause,
  });
}

/** A configuration error found offline in `init` or `setup`. */
export function configError(message: string): StepError {
  return new StepError(message, { code: 'config' });
}
