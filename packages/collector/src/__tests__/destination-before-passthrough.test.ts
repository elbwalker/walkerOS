// Destination's `before` chain references a pass-through transformer that
// has its own `before` chain. Confirms the inner chain runs.
//
// Bug 2: a pass-through transformer like
//   `enrichServer: { before: ["filterBots", "sessionLookup", "productEnrich"] }`
// is referenced as `destination.before: "enrichServer"`. The destination's
// chain walker runs `enrichServer`'s push (synthesized passthrough), but the
// inner `before` chain never invokes unless `initTransformers` propagates the
// def-level `before` to the synthesized instance's `config.before`.

import { startFlow } from '..';
import type { Transformer } from '@walkeros/core';

describe('destination.before references pass-through with own before chain', () => {
  it("runs the pass-through's before chain before reaching the destination", async () => {
    const order: string[] = [];
    const { collector, elb } = await startFlow({
      transformers: {
        spyA: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event) => {
              order.push('a');
              return { event };
            },
          }),
        },
        spyB: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event) => {
              order.push('b');
              return { event };
            },
          }),
        },
        spyC: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event) => {
              order.push('c');
              return { event };
            },
          }),
        },
        enrichChain: { before: ['spyA', 'spyB', 'spyC'] },
      },
      destinations: {
        capture: {
          code: {
            type: 'test',
            config: {},
            push: async () => {
              order.push('dest');
            },
          },
          before: ['enrichChain'],
        },
      },
    });

    await elb('page view', {});

    expect(order).toEqual(['a', 'b', 'c', 'dest']);
  });

  it("preserves a user-supplied code's own config.before over the def-level before", async () => {
    const order: string[] = [];
    const { collector, elb } = await startFlow({
      transformers: {
        spyA: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event) => {
              order.push('a');
              return { event };
            },
          }),
        },
        spyB: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event) => {
              order.push('b');
              return { event };
            },
          }),
        },
        // user-supplied code returns its own config including before
        custom: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'custom',
            config: { ...context.config, before: ['spyB'] }, // user-set before should win
            push: async (event) => {
              order.push('custom');
              return { event };
            },
          }),
          before: ['spyA'], // def-level before — should be overridden by user's config.before
        },
      },
      destinations: {
        capture: {
          code: {
            type: 'test',
            config: {},
            push: async () => {
              order.push('dest');
            },
          },
          before: ['custom'],
        },
      },
    });

    await elb('page view', {});

    expect(order).toEqual(['b', 'custom', 'dest']);
  });
});
