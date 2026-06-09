import { hints } from '../dev';

/**
 * The wiring contract is surfaced to MCP users via package hints. These keys
 * must stay present so `package_get(..., section: 'hints')` can show how to
 * place the transformer on a server source's `before` chain and where it reads
 * the raw request from.
 */
describe('hints', () => {
  it('exports hints', () => {
    expect(typeof hints).toBe('object');
    expect(Object.keys(hints).length).toBeGreaterThan(0);
  });

  it('documents the source.before wiring contract', () => {
    const text = Object.values(hints)
      .map((hint) => hint.text)
      .join('\n');
    expect(text).toContain('source.before');
    expect(text).toContain('ctx.ingest');
    expect(text).toContain('config.ingest');
  });
});
