import { schemas } from '@walkeros/core/dev';
import { eventFormatSchema } from '../event-format.schema';

/**
 * Drift guard. The committed eventFormatSchema is generated from the canonical
 * partialEventJsonSchema (zod EventSchema) at BUILD time. This test imports zod
 * via @walkeros/core/dev, but it is a TEST and never bundled into the runtime.
 *
 * If this fails, the canonical event schema changed; regenerate the artifact:
 *   npm run generate:format-schema
 */
describe('event-format.schema drift guard', () => {
  it('matches the canonical partialEventJsonSchema', () => {
    try {
      expect(eventFormatSchema).toEqual(schemas.partialEventJsonSchema);
    } catch (error) {
      const detail = error instanceof Error ? `\n\n${error.message}` : '';
      throw new Error(
        'event-format.schema is out of sync with the canonical ' +
          'partialEventJsonSchema. Regenerate it: ' +
          'npm run generate:format-schema' +
          detail,
      );
    }
  });
});
