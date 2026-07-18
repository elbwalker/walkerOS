import type { ObserveWeb } from '@walkeros/core';
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

  it('reads the SESSION-FORWARDING grant from the slot the activator persists it to', () => {
    // The container arm only accepts session-bound grants, so the header must
    // come from the companion slot (`elbPreviewSession`), never from the
    // activation grant in `elbPreview` (that could only ever sb-mismatch).
    const code = generateWrapEntry('/tmp/stage1.js', {
      previewGrantTargets: ['api'],
    });
    expect(code).toContain("localStorage.getItem('elbPreviewSession')");
    expect(code).not.toContain("localStorage.getItem('elbPreview')");
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

describe('generateWrapEntry preview-artifact observe connect', () => {
  const preview = {
    enabled: true,
    keyring: [{ kid: 'kid1', spki: 'c3BraQ' }],
    iss: 'app:stage',
    pb: 'pb_a',
    previewOrigin: 'cdn.example.com',
  };

  const observe: ObserveWeb = {
    url: 'https://obs.example',
    binding: 'pb_a',
    flowId: 'flow_1',
    level: 'trace',
  };

  it('bakes only public connect values, never an ingest token literal', () => {
    const code = generateWrapEntry('/tmp/stage1.js', {
      previewGrantTargets: ['api'],
      observe,
    });
    // The STATIC connect module rides the startFlow config: set before boot.
    expect(code).toContain('config.observe');
    expect(code).toContain('"url":"https://obs.example"');
    expect(code).toContain('"binding":"pb_a"');
    expect(code).toContain('"flowId":"flow_1"');
    expect(code).toContain('"level":"trace"');
    const observeIdx = code.indexOf('config.observe');
    const bootIdx = code.indexOf('await startFlow(config)');
    expect(observeIdx).toBeGreaterThan(-1);
    expect(bootIdx).toBeGreaterThan(observeIdx);
    // Former bake sites: no credential prefix, no bearer literal, no
    // token-shaped string may appear anywhere in the artifact entry.
    expect(code).not.toMatch(/obsw_/);
    expect(code).not.toMatch(/Bearer\s+[A-Za-z0-9]/);
    expect(code).not.toMatch(/token/i);
  });

  it('still never bakes the activator (anti-recursion holds with the connect module)', () => {
    const code = generateWrapEntry('/tmp/stage1.js', {
      previewGrantTargets: ['api'],
      observe,
    });
    expect(code).not.toContain('browserSwapActivator');
    // The connect module is pure config; the artifact entry needs zero core
    // imports (the old telemetry block was the only importer).
    expect(code).not.toContain("from '@walkeros/core'");
  });

  it('bakes the connect module for a web-only artifact (no grant targets)', () => {
    const code = generateWrapEntry('/tmp/stage1.js', { observe });
    expect(code).toContain('config.observe');
    expect(code).not.toContain('X-Walkeros-Preview');
    expect(code).not.toMatch(/obsw_/);
    expect(code).not.toMatch(/Bearer\s+[A-Za-z0-9]/);
    expect(code).not.toMatch(/token/i);
  });

  it('omits optional scoping fields that are not set', () => {
    const code = generateWrapEntry('/tmp/stage1.js', {
      observe: { url: 'https://obs.example', binding: 'pb_a' },
    });
    expect(code).toContain('config.observe');
    expect(code).not.toContain('flowId');
    expect(code).not.toContain('level');
    expect(code).not.toContain('sample');
  });

  it('rejects the legacy baked-token telemetry combined with the connect module', () => {
    expect(() =>
      generateWrapEntry('/tmp/stage1.js', {
        observe,
        telemetry: {
          observerUrl: 'https://obs.example/ingest/preview/prv_1',
          ingestToken: 'tok_secret',
          flowId: 'flow_1',
          level: 'trace',
        },
      }),
    ).toThrow(/mutually exclusive/i);
  });

  it('the activator-true path returns before the host connect module installs', () => {
    // Double-install guard: a host bundle that carries BOTH the activator and
    // its own connect module must never install the connect module once the
    // activator swaps the artifact in. The activator's early return precedes
    // the observe bake (and the boot), so an activated page runs neither.
    const code = generateWrapEntry('/tmp/stage1.js', { preview, observe });
    const activatorIdx = code.indexOf('if (await browserSwapActivator(');
    const observeIdx = code.indexOf('config.observe');
    const bootIdx = code.indexOf('await startFlow(config)');
    expect(activatorIdx).toBeGreaterThan(-1);
    expect(observeIdx).toBeGreaterThan(activatorIdx);
    expect(bootIdx).toBeGreaterThan(observeIdx);
  });
});
