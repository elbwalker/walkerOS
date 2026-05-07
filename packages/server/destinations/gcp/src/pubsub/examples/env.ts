/**
 * Example environment metadata for GCP Pub/Sub destination.
 *
 * Tests substitute the real SDK via `jest.mock('@google-cloud/pubsub')`,
 * which is the recommended pattern: imports of `@google-cloud/pubsub` get
 * replaced module-wide, no env-injection plumbing required at the call site.
 *
 * The `simulation` list documents which globals the destination touches
 * during a simulated run, used by the simulator to know what to stub.
 */

export const simulation = ['PubSub'];
