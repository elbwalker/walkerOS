import { z } from '../validation';
import { zodToSchema } from '..';

interface JsonNode {
  required?: string[];
  properties?: Record<string, JsonNode>;
  default?: unknown;
}

describe('zodToSchema - required reflects real usage', () => {
  it('omits fields that have a default from required', () => {
    const schema = z.object({
      prefix: z.string().default('data-elb'),
      apiKey: z.string(),
    });

    const json = zodToSchema(schema) as JsonNode;

    expect(json.required).toEqual(['apiKey']);
  });

  it('keeps fields without a default in required', () => {
    const schema = z.object({
      apiKey: z.string(),
      region: z.string(),
    });

    const json = zodToSchema(schema) as JsonNode;

    expect(json.required).toEqual(['apiKey', 'region']);
  });

  it('normalizes required inside nested objects', () => {
    const schema = z.object({
      ga4: z.object({
        measurementId: z.string(),
        debug: z.boolean().default(false),
      }),
    });

    const json = zodToSchema(schema) as JsonNode;

    expect(json.properties?.ga4?.required).toEqual(['measurementId']);
  });
});
