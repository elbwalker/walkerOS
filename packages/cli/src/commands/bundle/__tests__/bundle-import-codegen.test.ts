import {
  buildSplitConfigObject,
  detectNamedImports,
  applyStepPackages,
  createEntryPoint,
} from '../bundler';
import { createMockLogger } from '@walkeros/core';
import type { Flow } from '@walkeros/core';
import type { BuildOptions } from '../../../types/bundle.js';

describe('named-import codegen via buildSplitConfigObject', () => {
  it('emits the user-specified import name into the code skeleton', () => {
    const flow = {
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
          import: 'sourceBrowser',
          config: {},
        },
      },
      destinations: {
        gtag: {
          package: '@walkeros/web-destination-gtag',
          import: 'destinationGtag',
          config: {},
        },
      },
    } as unknown as Flow;

    const namedImports = detectNamedImports(flow);
    const { codeConfigObject } = buildSplitConfigObject(flow, namedImports);

    // Source wires through the named-import variable, not packageNameToVariable.
    expect(codeConfigObject).toMatch(
      /browser:\s*\{[\s\S]*?code:\s*sourceBrowser/,
    );
    // Destination too.
    expect(codeConfigObject).toMatch(
      /gtag:\s*\{[\s\S]*?code:\s*destinationGtag/,
    );
    // The synthetic underscore-prefixed default-import variable must not appear.
    expect(codeConfigObject).not.toMatch(/_walkerosWebSourceBrowser/);
    expect(codeConfigObject).not.toMatch(/_walkerosWebDestinationGtag/);
  });

  it('falls back to default-import variable when import is absent', () => {
    const flow = {
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
          config: {},
        },
      },
    } as unknown as Flow;

    const namedImports = detectNamedImports(flow);
    const { codeConfigObject } = buildSplitConfigObject(flow, namedImports);

    // Default-import path: variable name derived from package.
    expect(codeConfigObject).toMatch(
      /browser:\s*\{[\s\S]*?code:\s*_walkerosWebSourceBrowser/,
    );
  });
});

describe('generated import statements heal an inline-versioned step package', () => {
  it('imports from the bare specifier, not the raw versioned step spec', async () => {
    // applyStepPackages rewrites inline-versioned step specs to bare names
    // before codegen, so generated imports always use resolvable bare specifiers.
    const flow = {
      sources: {
        browser: {
          package: '@walkeros/web-source-browser@4.3.0-next-1783517345197',
          import: 'sourceBrowser',
          config: {},
        },
      },
    } as unknown as Flow;

    const packages: BuildOptions['packages'] = {};
    const logger = createMockLogger();
    applyStepPackages(flow, packages, logger);

    const buildOptions: BuildOptions = {
      output: 'flow.mjs',
      packages,
      format: 'esm',
      platform: 'node',
    };

    const { codeEntry } = await createEntryPoint(
      flow,
      buildOptions,
      new Map(),
      logger,
    );

    expect(codeEntry).toMatch(
      /import \{ sourceBrowser \} from '@walkeros\/web-source-browser';/,
    );
    expect(codeEntry).toContain("from '@walkeros/web-source-browser'");
    expect(codeEntry).not.toContain('@4.3.0-next');
  });
});
