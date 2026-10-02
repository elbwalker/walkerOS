import {
  isServerError,
  isThrottlingError,
  isTransientError,
} from '@smithy/core/retry';

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

export interface AwsDeliveryErrorOptions {
  code: string;
  status?: number;
  retryable: boolean;
  cause?: unknown;
}

/**
 * Every failure this package reports or throws. `code` is the AWS error name
 * or one of the package's own codes (`RecordTooLarge`, `InvalidRecord`,
 * `InvalidResponse`, `InvalidConfig`), `status` the HTTP status when AWS
 * answered, and `retryable` whether sending the same record again can succeed.
 * The SDK error stays reachable as `cause`.
 */
export class AwsDeliveryError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly retryable: boolean;

  constructor(message: string, options: AwsDeliveryErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'AwsDeliveryError';
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable;
  }
}

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

/** Builds the message: target, code, the AWS text and, if listed, the fix. */
export function formatMessage(
  target: DeliveryTarget,
  code: string,
  text: string,
): string {
  const hint = hintFor(code, target);
  const base = `${describe(target)}: ${code}: ${text}`;
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
 * Wraps an error a whole call threw. `retryable` is the SDK's own public
 * classifier, the one its standard retry strategy uses, so this package keeps
 * no table of its own.
 */
export function fromSdkError(
  error: unknown,
  target: DeliveryTarget,
): AwsDeliveryError {
  if (error instanceof AwsDeliveryError) return error;

  if (!isSdkError(error)) {
    return new AwsDeliveryError(
      formatMessage(target, 'UnknownError', String(error)),
      { code: 'UnknownError', retryable: false, cause: error },
    );
  }

  const code = readCode(error);
  const retryable =
    isThrottlingError(error) || isTransientError(error) || isServerError(error);

  return new AwsDeliveryError(formatMessage(target, code, error.message), {
    code,
    status: error.$metadata?.httpStatusCode,
    retryable,
    cause: error,
  });
}

/**
 * A record AWS rejected inside an accepted call. Both per-record codes AWS
 * documents for PutRecordBatch (`ServiceUnavailableException`,
 * `InternalFailure`) are retryable, so every such rejection is.
 */
export function recordError(
  target: DeliveryTarget,
  code: string,
  text: string,
  status?: number,
): AwsDeliveryError {
  return new AwsDeliveryError(formatMessage(target, code, text), {
    code,
    status,
    retryable: true,
  });
}

/**
 * A failure this package detected itself, without an AWS answer to classify:
 * a record it refused to send, or a response it could not read.
 */
export function localError(
  target: DeliveryTarget,
  code: 'RecordTooLarge' | 'InvalidRecord' | 'InvalidResponse',
  text: string,
  cause?: unknown,
): AwsDeliveryError {
  return new AwsDeliveryError(formatMessage(target, code, text), {
    code,
    retryable: code === 'InvalidResponse',
    cause,
  });
}

/** A configuration error found offline in `init` or `setup`. */
export function configError(message: string): AwsDeliveryError {
  return new AwsDeliveryError(message, {
    code: 'InvalidConfig',
    retryable: false,
  });
}
