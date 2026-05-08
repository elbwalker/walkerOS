import type { Decoder } from './types';

export class DecoderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecoderError';
  }
}

/**
 * Decode an SQS message body string.
 *
 * - 'json': JSON.parse(body). Throws DecoderError on parse failure.
 * - 'text': body returned as-is.
 * - 'raw': Buffer.from(body, 'utf8').
 */
export function decodeBody(
  messageId: string,
  body: string,
  decoder: Decoder,
): unknown {
  if (decoder === 'raw') return Buffer.from(body, 'utf8');
  if (decoder === 'text') return body;
  // json
  try {
    return JSON.parse(body);
  } catch (err) {
    throw new DecoderError(
      `SQS message ${messageId} JSON decode failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
