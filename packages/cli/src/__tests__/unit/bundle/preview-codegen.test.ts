import { generateWrapEntry } from '../../../commands/bundle/bundler';

describe('generateWrapEntry preview codegen', () => {
  const preview = {
    enabled: true,
    keyring: [{ kid: 'kid1', spki: 'c3BraQ' }],
    iss: 'app:stage',
    pb: 'pb_a',
    previewOrigin: 'cdn.example.com',
  };

  it('emits no preview code when preview is absent', () => {
    const code = generateWrapEntry('/tmp/stage1.js');
    expect(code).not.toContain('browserSwapActivator');
    expect(code).not.toContain('elbPreview');
  });

  it('emits no preview code when preview is explicitly disabled', () => {
    const code = generateWrapEntry('/tmp/stage1.js', {
      preview: { ...preview, enabled: false },
    });
    expect(code).not.toContain('browserSwapActivator');
  });

  it('imports the activator from web-core and short-circuits the production boot', () => {
    const code = generateWrapEntry('/tmp/stage1.js', { preview });
    expect(code).toContain(
      "import { browserSwapActivator } from '@walkeros/web-core';",
    );
    expect(code).toContain('browserSwapActivator');
    expect(code).toMatch(
      /if \(await browserSwapActivator\([\s\S]*?\)\) return;/,
    );
    // The baked config must carry the keyring and the project binding…
    expect(code).toContain('"kid":"kid1"');
    expect(code).toContain('"pb":"pb_a"');
    // …and must never carry a project id or a scope override.
    expect(code).not.toContain('previewScope');
    expect(code).not.toContain('__parseSwap');
  });

  it('emits the activator before startFlow so production never boots under preview', () => {
    const code = generateWrapEntry('/tmp/stage1.js', { preview });
    // Anchor on the CALL sites, not the identifiers: both names also appear in
    // the import statement at the top, which would satisfy a bare indexOf even
    // if the activator check moved below the production boot.
    const activatorCall = code.indexOf('if (await browserSwapActivator(');
    const bootCall = code.indexOf('await startFlow(config)');
    expect(activatorCall).toBeGreaterThan(-1);
    expect(bootCall).toBeGreaterThan(-1);
    expect(activatorCall).toBeLessThan(bootCall);
  });
});
