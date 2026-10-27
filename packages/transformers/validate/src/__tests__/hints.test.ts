import { hints } from '../hints';

describe('hints', () => {
  it('says the step must be wired into a chain', () => {
    expect(hints['mode-strict-vs-pass'].text).toContain('collector.next');
  });

  it('states the issue level as it is', () => {
    const text = hints['known-limitations'].text;
    expect(text).not.toMatch(/\bv1\b|\byet\b/);
    expect(text).toContain('no warn level');
  });
});
