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
    expect(text).toContain('direct field paths on the request scope');
    expect(text).not.toContain('Express req');
  });

  it('wires the express source on the gtag.js path', () => {
    const block = hints.wiring.code?.[0];
    expect(block).toBeDefined();
    const flow = JSON.parse(block?.code ?? '{}');
    expect(flow.sources.http.package).toBe('@walkeros/server-source-express');
    expect(flow.sources.http.config.settings.paths).toContain('/g/collect');
    expect(hints.wiring.text).toContain("settings.paths: ['/g/collect']");
  });

  it('names the sources that keep a raw batched body and the Lambda limitation', () => {
    const text = hints['source-choice']?.text ?? '';
    expect(text).toMatch(
      /@walkeros\/server-source-express keeps a text\/plain body that is not JSON as ingest\.body/,
    );
    expect(text).toContain('@walkeros/server-source-fetch');
    expect(text).toContain('@walkeros/server-source-gcp');
    expect(text).toMatch(
      /sourceLambda \(@walkeros\/server-source-aws\) answers a POST without a body with 400/,
    );
    expect(Object.values(hints).map((hint) => hint.text)).not.toContainEqual(
      expect.stringMatching(/express[^.]*400/),
    );
  });
});
