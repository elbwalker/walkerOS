import { isObject } from '@walkeros/core';
import { settings } from '../schemas';

/** The description of a top-level settings property. */
function described(key: string): unknown {
  const property = isObject(settings.properties)
    ? settings.properties[key]
    : undefined;
  return isObject(property) ? property.description : undefined;
}

describe('schemas', () => {
  it('says identify values reach the Pixel unhashed', () => {
    const identify = described('identify');

    expect(identify).not.toMatch(/auto-hashed/);
    expect(identify).toMatch(/unhashed/);
  });

  it('claims no TikTok default value for the forwarded load options', () => {
    expect(described('auto_config')).not.toMatch(/default: (true|false)/);
    expect(described('limited_data_use')).not.toMatch(/default: (true|false)/);
  });
});
