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

  it('imports the activator from core and short-circuits the production boot', () => {
    const code = generateWrapEntry('/tmp/stage1.js', { preview });
    expect(code).toContain("from '@walkeros/core'");
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
    expect(code.indexOf('browserSwapActivator')).toBeLessThan(
      code.indexOf('startFlow'),
    );
  });
});

describe('generateWrapEntry preview-artifact grant injection', () => {
  const preview = {
    enabled: true,
    keyring: [{ kid: 'kid1', spki: 'c3BraQ' }],
    iss: 'app:stage',
    pb: 'pb_a',
    previewOrigin: 'cdn.example.com',
  };

  it('injects the stored grant into the declared server-bound destinations', () => {
    // previewGrantTargets is its OWN wrap option for the preview-artifact
    // variant — NOT part of the host activator's `preview` config. An artifact
    // must never bake the activator (it would re-inject itself from storage).
    const code = generateWrapEntry('/tmp/stage1.js', {
      previewGrantTargets: ['api'],
    });
    expect(code).toContain('localStorage.getItem');
    expect(code).toContain("config.destinations['api']");
    expect(code).toContain('X-Walkeros-Preview');
    expect(code).not.toContain('browserSwapActivator'); // anti-recursion
    // The grant must NEVER be a literal in the public artifact.
    expect(code).not.toMatch(/eyJhbGciOi/);
  });

  it('reads the grant from the same localStorage key the activator persists', () => {
    const code = generateWrapEntry('/tmp/stage1.js', {
      previewGrantTargets: ['api'],
    });
    expect(code).toContain("localStorage.getItem('elbPreview')");
  });

  it('injects into every declared target and leaves others untouched', () => {
    const code = generateWrapEntry('/tmp/stage1.js', {
      previewGrantTargets: ['api', 'httpApi'],
    });
    expect(code).toContain("config.destinations['api']");
    expect(code).toContain("config.destinations['httpApi']");
    expect(code).not.toContain("config.destinations['ga4']");
  });

  it('emits no injection when previewGrantTargets is absent', () => {
    const code = generateWrapEntry('/tmp/stage1.js');
    expect(code).not.toContain('X-Walkeros-Preview');
    expect(code).not.toContain('elbPreview');
  });

  it('emits no injection for an empty previewGrantTargets list', () => {
    const code = generateWrapEntry('/tmp/stage1.js', {
      previewGrantTargets: [],
    });
    expect(code).not.toContain('X-Walkeros-Preview');
    expect(code).not.toContain('elbPreview');
  });

  it('throws when both preview and previewGrantTargets are set (anti-recursion)', () => {
    expect(() =>
      generateWrapEntry('/tmp/stage1.js', {
        preview,
        previewGrantTargets: ['api'],
      }),
    ).toThrow(/mutually exclusive/i);
  });
});
