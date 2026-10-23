import { isObject } from '@walkeros/core';
import { settings } from '../schemas';

function description(key: string): unknown {
  const properties = settings.properties;
  return isObject(properties) && isObject(properties[key])
    ? properties[key].description
    : undefined;
}

describe('schemas', () => {
  it('userId text shows a fallback chain, not a static value', () => {
    const userId = description('userId');
    expect(userId).toMatch(/\["user\.id", "user\.device"\]/);
    expect(userId).not.toMatch(/key: "user\.id"/);
  });

  it('attributes text says when attributes are applied', () => {
    expect(description('attributes')).toMatch(/user context is created/);
  });
});
