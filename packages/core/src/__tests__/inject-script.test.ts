/**
 * @jest-environment jsdom
 */
import { injectScript } from '../inject-script';

beforeEach(() => {
  document.head.innerHTML = '';
});

it('resolves false when the page refuses the script URL', async () => {
  // A page that requires Trusted Types throws on a plain string src.
  const script = document.createElement('script');
  Object.defineProperty(script, 'src', {
    set() {
      throw new TypeError(
        "This document requires 'TrustedScriptURL' assignment.",
      );
    },
  });
  jest.spyOn(document, 'createElement').mockReturnValueOnce(script);

  await expect(
    injectScript('https://cdn.test/tag-mode/x.js', 'sha384-x'),
  ).resolves.toBe(false);
  expect(document.head.querySelector('script')).toBeNull();
});
