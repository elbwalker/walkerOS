import { isObject } from '@walkeros/core';
import { settings } from '../schemas';

describe('schemas', () => {
  it('send_page_view text says d8a sends a page_view by default', () => {
    const properties = settings.properties;
    const sendPageView =
      isObject(properties) && isObject(properties.send_page_view)
        ? properties.send_page_view.description
        : undefined;

    expect(sendPageView).toMatch(/Default true/);
  });
});
