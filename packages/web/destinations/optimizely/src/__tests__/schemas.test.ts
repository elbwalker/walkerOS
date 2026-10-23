import { isObject } from '@walkeros/core';
import { mapping, settings } from '../schemas';

function description(key: string, schema = settings): unknown {
  const properties = schema.properties;
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
    const attributes = description('attributes');
    expect(attributes).toMatch(/user context is created/);
    expect(attributes).toMatch(/differs from the previous event/);
    expect(attributes).not.toMatch(/first event of each userId/);
  });

  it('eventKey text says it has no effect and names the rule name', () => {
    const eventKey = description('eventKey', mapping);
    expect(eventKey).toMatch(/no effect/);
    expect(eventKey).toMatch(/rule's name/);
    expect(eventKey).not.toMatch(/^Override/);
  });
});
