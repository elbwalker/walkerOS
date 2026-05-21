import { validateJsonSchema, validateEventsJsonSchema } from '../flow';
import { schemas } from '../../dev';

describe('validate JSON Schema exports', () => {
  test('validateJsonSchema describes the step validate object', () => {
    expect(validateJsonSchema).toMatchObject({
      type: 'object',
      title: 'Validate',
      properties: {
        format: expect.anything(),
        events: expect.anything(),
        schema: expect.anything(),
      },
    });
  });

  test('validateEventsJsonSchema is a generated JSON Schema object', () => {
    expect(validateEventsJsonSchema).toBeDefined();
    expect(typeof validateEventsJsonSchema).toBe('object');
  });

  test('validateJsonSchema carries field descriptions', () => {
    const { format, schema } = validateJsonSchema.properties ?? {};
    expect(typeof format).toBe('object');
    expect(typeof schema).toBe('object');
    if (typeof format === 'object') expect(format.description).toBeTruthy();
    if (typeof schema === 'object') expect(schema.description).toBeTruthy();
  });
});

describe('direct schema export promotion', () => {
  test('validate schemas are reachable as schemas.X', () => {
    expect(schemas.ValidateSchema).toBeDefined();
    expect(schemas.ValidateEventsSchema).toBeDefined();
    expect(schemas.validateJsonSchema).toBeDefined();
  });

  test('no-many route schema is reachable as schemas.X', () => {
    expect(schemas.RouteWithoutManySchema).toBeDefined();
  });
});
