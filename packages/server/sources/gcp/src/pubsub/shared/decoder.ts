import type { Decoder } from './types';

/**
 * Minimal message shape consumed by `decodeMessage`. The real Pub/Sub
 * `Message` class satisfies this implicitly; the push handler synthesizes
 * an object literal that satisfies it too.
 *
 * Keeping this internal interface avoids forcing the push code path to
 * fabricate a full `Message` instance (which has private fields).
 */
export interface DecodableMessage {
  id: string;
  data: Buffer;
}

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
export function decodeMessage(
  message: DecodableMessage,
  decoder: Decoder,
): unknown {
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
