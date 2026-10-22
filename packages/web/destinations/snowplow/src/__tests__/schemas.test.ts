import { isObject } from '@walkeros/core';
import { mapping, settings } from '../schemas';

describe('schemas', () => {
  it('describes the rule settings the destination reads', () => {
    const properties = isObject(mapping.properties) ? mapping.properties : {};
    expect(Object.keys(properties).sort()).toEqual(
      ['context', 'data', 'snowplow', 'struct'].sort(),
    );
  });

  it('lists the browser context', () => {
    const contexts =
      isObject(settings.properties) && isObject(settings.properties.contexts)
        ? settings.properties.contexts.properties
        : undefined;
    expect(isObject(contexts) && Object.keys(contexts)).toContain('browser');
  });
});
