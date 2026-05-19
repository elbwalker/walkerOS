import { buildSplitConfigObject, detectNamedImports } from '../bundler';
import type { Flow } from '@walkeros/core';

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
