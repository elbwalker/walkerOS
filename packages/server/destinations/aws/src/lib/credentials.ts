import { isObject } from '@walkeros/core';
import { configError } from './errors';

/**
 * Static AWS keys, the shape `config.credentials` takes. Back each value with
 * `$secret`; a literal key in a flow file is a leaked key.
 */
export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

/** `config.credentials` as written: the object, or the same object as JSON. */
export type CredentialsInput = AwsCredentials | string;

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Checks `config.credentials` offline and returns the keys, or `undefined`
 * when the slot is unset (the SDK's default chain then applies).
 *
 * Messages name the field that is wrong and never a value: a credentials
 * error ends up in logs, and the value it would echo is the secret.
 */
export function parseCredentials(input: unknown): AwsCredentials | undefined {
  if (input === undefined || input === null || input === '') return undefined;

  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      // The parser's own message quotes the input, so it is not passed on.
      throw configError(
        'config.credentials is not valid JSON. Expected {"accessKeyId", "secretAccessKey", "sessionToken"?}.',
      );
    }
  }

  if (!isObject(value))
    throw configError(
      'config.credentials must be an object with accessKeyId and secretAccessKey.',
    );

  const { accessKeyId, secretAccessKey, sessionToken } = value;

  for (const [field, fieldValue] of [
    ['accessKeyId', accessKeyId],
    ['secretAccessKey', secretAccessKey],
  ] as const) {
    if (!nonEmpty(fieldValue))
      throw configError(
        `config.credentials.${field} is missing or empty. Set it from a $secret.`,
      );
  }

  if (sessionToken !== undefined && !nonEmpty(sessionToken))
    throw configError(
      'config.credentials.sessionToken must be a non-empty string when set.',
    );

  const credentials: AwsCredentials = {
    accessKeyId: String(accessKeyId),
    secretAccessKey: String(secretAccessKey),
  };
  if (sessionToken !== undefined) credentials.sessionToken = sessionToken;
  return credentials;
}
