import { isObject } from '@walkeros/core';
import { settings } from '../schemas';

describe('schemas', () => {
  it('identify text says init loads without an identity', () => {
    const properties = settings.properties;
    const identify =
      isObject(properties) && isObject(properties.identify)
        ? properties.identify.description
        : undefined;

    expect(identify).not.toMatch(/tagId, data/);
    expect(identify).toMatch(/hashed/);
  });
});
