import { isObject } from '@walkeros/core';
import { settings } from '../schemas';

describe('schemas', () => {
  it('headers text keeps secrets out of the browser', () => {
    const properties = settings.properties;
    const headers =
      isObject(properties) && isObject(properties.headers)
        ? properties.headers.description
        : undefined;

    expect(headers).not.toMatch(/Authorization|Bearer/);
    expect(headers).toMatch(/never a secret/);
  });
});
