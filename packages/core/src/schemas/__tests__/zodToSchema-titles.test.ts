import { z } from '../validation';
import { zodToSchema } from '..';

interface JsonNode {
  type?: string;
  title?: string;
  properties?: Record<string, JsonNode>;
}

describe('zodToSchema - nested object titles', () => {
  it('titles an untitled nested object from its property key', () => {
    const schema = z.object({
      ga4: z.object({ measurementId: z.string() }),
      name: z.string(),
    });

    const json = zodToSchema(schema) as JsonNode;
    const ga4 = json.properties?.ga4;

    expect(ga4?.type).toBe('object');
    expect(ga4?.title).toBe('ga4');
  });

  it('does not add a title to scalar properties', () => {
    const schema = z.object({ name: z.string() });

    const json = zodToSchema(schema) as JsonNode;

    expect(json.properties?.name?.title).toBeUndefined();
  });

  it('preserves an explicit title from meta instead of using the key', () => {
    const schema = z.object({
      thing: z.object({ id: z.string() }).meta({ title: 'Custom.Thing' }),
    });

    const json = zodToSchema(schema) as JsonNode;

    expect(json.properties?.thing?.title).toBe('Custom.Thing');
  });

  it('titles nested objects at deeper levels from their keys', () => {
    const schema = z.object({
      outer: z.object({
        inner: z.object({ leaf: z.string() }),
      }),
    });

    const json = zodToSchema(schema) as JsonNode;

    expect(json.properties?.outer?.title).toBe('outer');
    expect(json.properties?.outer?.properties?.inner?.title).toBe('inner');
  });
});
