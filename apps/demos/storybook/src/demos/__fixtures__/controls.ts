import type { DemoControls } from '../../shared/controls';

const noop = () => {};

/**
 * The default demo controls (Anonymous, English, consent unknown) with no-op
 * callbacks, for rendering a page in a test.
 */
export function testControls(
  overrides: Partial<DemoControls> = {},
): DemoControls {
  return {
    persona: 'anonymous',
    onPersonaSwitch: noop,
    language: 'en',
    onLanguageToggle: noop,
    consent: {
      state: 'unknown',
      onAccept: noop,
      onDeny: noop,
      onReset: noop,
    },
    elb: async () => ({ ok: true }),
    ...overrides,
  };
}
