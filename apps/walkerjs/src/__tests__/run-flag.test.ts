import { createWalkerjs } from '../index';

/**
 * The top-level `run` flag is part of the walker.js public surface: it is in
 * `Config`, in the published `walkerOS.json` settings schema, and it is what an
 * inline `data-elbconfig="run:false"` parses into. It gates the collector's
 * auto-run, so `allowed` is the observable it controls.
 */
describe('run flag', () => {
  const start = (config: Record<string, unknown>) =>
    createWalkerjs({
      session: false,
      browser: { pageview: false },
      ...config,
    });

  test('defaults to auto-run', async () => {
    const { collector } = await start({});

    expect(collector.allowed).toBe(true);
  });

  test('top-level run:false keeps the collector from auto-running', async () => {
    const { collector } = await start({ run: false });

    expect(collector.allowed).toBe(false);
  });

  test('collector.run:false keeps the collector from auto-running', async () => {
    const { collector } = await start({ collector: { run: false } });

    expect(collector.allowed).toBe(false);
  });

  test('top-level run wins over the collector passthrough', async () => {
    const { collector } = await start({ run: false, collector: { run: true } });

    expect(collector.allowed).toBe(false);
  });
});
