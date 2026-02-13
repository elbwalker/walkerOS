import type { Transformer } from '@walkeros/core';
import { branch } from '@walkeros/core';
import type { RouterSettings, CompiledRoute } from './types';
import { compileMatcher } from './matcher';

export const transformerRouter: Transformer.Init<
  Transformer.Types<RouterSettings>
> = (context) => {
  const { config } = context;
  const settings = config.settings || {};
  const routes = settings.routes || [];

  // Compile all routes at init time (regex, closures — done once)
  const compiledRoutes: CompiledRoute[] = routes.map((route) => ({
    match: compileMatcher(route.match),
    next: route.next,
  }));

  return {
    type: 'router',
    config,
    push(event, context) {
      const ingest = (context.ingest || {}) as Record<string, unknown>;

      // First match wins
      for (const route of compiledRoutes) {
        if (route.match(ingest)) {
          // Branch: reset event to {}, let parser build from ingest
          return branch({}, route.next);
        }
      }

      // No match → passthrough (event continues unchanged)
      return;
    },
  };
};
