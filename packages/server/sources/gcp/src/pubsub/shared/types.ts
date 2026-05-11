/**
 * Shared types for the Pub/Sub source (pull and push).
 *
 * The source uses real `@google-cloud/pubsub` SDK types directly (`PubSub`,
 * `Subscription`, `Topic`, `Message`, `SubscriptionMetadata`, etc.) rather
 * than hand-rolled narrow surrogates. This keeps the runtime contract
 * honest: if the SDK changes a signature, the source surfaces the break
 * at compile time instead of papering over it with a permissive interface.
 *
 * Only domain types that have no SDK equivalent live here.
 */

/**
 * Service account credentials. Mirrors the destination shape in
 * `@walkeros/server-destination-gcp`.
 */
export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/**
 * Decoder mode for the message data payload.
 *
 * - `json`: JSON.parse(data.toString('utf8')). Default.
 * - `text`: data.toString('utf8'). The text becomes the event payload.
 * - `raw`: the raw Buffer is forwarded as-is.
 */
export type Decoder = 'json' | 'text' | 'raw';
