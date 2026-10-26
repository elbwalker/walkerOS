import { isObject } from '@walkeros/core';
import { mapping } from '../schemas';

describe('schemas', () => {
  it('conversion text says a missing id fails the push', () => {
    const properties = mapping.properties;
    const conversion =
      isObject(properties) && isObject(properties.conversion)
        ? properties.conversion.description
        : undefined;

    expect(conversion).toMatch(/missing-input/);
    expect(conversion).not.toMatch(/silently/);
  });
});
