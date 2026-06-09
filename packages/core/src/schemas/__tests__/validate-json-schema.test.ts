import { validateEventsJsonSchema } from '../flow';
import { schemas } from '../../dev';

describe('validate JSON Schema exports', () => {
  test('validateEventsJsonSchema is a generated JSON Schema object', () => {
    expect(validateEventsJsonSchema).toBeDefined();
    expect(typeof validateEventsJsonSchema).toBe('object');
  });
});

describe('direct schema export promotion', () => {
  test('validate-events schemas are reachable as schemas.X', () => {
    expect(schemas.ValidateEventsSchema).toBeDefined();
    expect(schemas.validateEventsJsonSchema).toBeDefined();
  });

  test('no-many route schema is reachable as schemas.X', () => {
    expect(schemas.RouteWithoutManySchema).toBeDefined();
  });
});
