import type { Decoder, MessageLike } from './types';

export class DecoderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecoderError';
  }
}

/**
 * Decode the data field of a Pub/Sub message.
 *
 * - `json`: JSON.parse(data.toString('utf8')). Throws DecoderError on parse failure.
 * - `text`: data.toString('utf8').
 * - `raw`: the raw Buffer.
 *
 * Returning null/undefined is allowed (caller may ack-and-drop).
 */
export function decodeMessage(message: MessageLike, decoder: Decoder): unknown {
  if (decoder === 'raw') return message.data;
  const text = message.data.toString('utf8');
  if (decoder === 'text') return text;
  // json
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new DecoderError(
      `Pub/Sub message ${message.id} JSON decode failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
