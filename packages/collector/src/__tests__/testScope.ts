import type { Source } from '@walkeros/core';

/**
 * Builds a complete `Source.Scope` for tests.
 *
 * Sources hand `withScope` a normalized scope, so a test that needs to carry
 * fixture data does it through the contract's own fields (`headers`, `query`,
 * `body`) rather than through a bespoke raw shape.
 *
 * @param overrides Fields to override on the default scope.
 * @returns A complete scope.
 */
export function testScope(overrides: Partial<Source.Scope> = {}): Source.Scope {
  return {
    method: 'POST',
    url: '',
    path: '/',
    query: {},
    headers: {},
    body: undefined,
    raw: {},
    ...overrides,
  };
}
