import type { On, Source, WalkerOS } from '@walkeros/core';
import { startFlow } from '../flow';

/**
 * Adversarial guards for order-independent require activation. The reconcile
 * driver may STRUCTURALLY activate a step from current state, but it must stay
 * DELIVERY-INERT while `!allowed`, must never double-activate, and any
 * activation cascade it triggers must terminate.
 */
describe('reconcile adversarial guards', () => {
  // Build a flow where a provider source emits consent from its init, a
  // dependent source gated on consent pushes a `page view` only on run, and two
  // capture destinations observe delivery (one ungated, one marketing-gated).
  async function buildPrivacyFlow(consentValue: WalkerOS.Consent) {
    const captured: string[] = [];
    const gated: string[] = [];
    const onSpy = jest.fn();

    const { collector } = await startFlow({
      run: false,
      sources: {
        cmp: {
          code: async (ctx: any): Promise<Source.Instance> => ({
            type: 'cmp',
            config: {},
            push: ctx.env.elb,
            init: async () => {
              await ctx.env.command('consent', consentValue);
            },
          }),
        },
        src: {
          code: async (ctx: any): Promise<Source.Instance> => ({
            type: 'src',
            config: {},
            push: ctx.env.elb,
            on: async (type: On.Types): Promise<void> => {
              onSpy(type);
              if (type === 'run') await ctx.env.elb({ name: 'page view' });
            },
          }),
          config: { require: ['consent'] },
        },
      },
      destinations: {
        capture: {
          code: {
            type: 'capture',
            push: async (e: WalkerOS.Event) => {
              captured.push(e.name);
            },
            config: {},
          },
        },
        gatedDest: {
          code: {
            type: 'gated',
            push: async (e: WalkerOS.Event) => {
              gated.push(e.name);
            },
            config: {},
          },
          config: { consent: { marketing: true } },
        },
      },
    });

    return { collector, captured, gated, onSpy };
  }

  test('I8/I10: granted consent — silent pre-run, both deliver post-run', async () => {
    const { collector, captured, gated, onSpy } = await buildPrivacyFlow({
      marketing: true,
    });

    // src activated from current consent (registration reconcile)...
    expect(collector.sources['src'].config.require?.length || 0).toBe(0);
    // ...but DELIVERY-INERT while !allowed: no push reached a destination, and
    // the source's consent handler was deferred (mark not advanced).
    expect(captured).toEqual([]);
    expect(gated).toEqual([]);
    expect(onSpy).not.toHaveBeenCalledWith('consent', expect.anything());

    await collector.command('run');

    // Post-run: src reacts to run, pushes page view; granted marketing → both.
    expect(captured).toContain('page view');
    expect(gated).toContain('page view');
  });

  test('I10: denied consent — ungated delivers post-run, gated stays empty', async () => {
    const { collector, captured, gated } = await buildPrivacyFlow({
      marketing: false,
    });

    // Presence (not grant) activates the source.
    expect(collector.sources['src'].config.require?.length || 0).toBe(0);
    expect(captured).toEqual([]);
    expect(gated).toEqual([]);

    await collector.command('run');

    // Ungated capture receives the event; marketing-gated receives nothing.
    expect(captured).toContain('page view');
    expect(gated).toEqual([]);
  });

  test('I11: re-run is idempotent — same instances, no extra state delivery', async () => {
    const onSpy = jest.fn();
    const { collector } = await startFlow({
      run: false,
      consent: { marketing: true },
      sources: {
        src: {
          code: async (ctx: any): Promise<Source.Instance> => ({
            type: 'src',
            config: {},
            push: ctx.env.elb,
            on: onSpy,
          }),
          config: { require: ['consent'] },
        },
      },
      destinations: {
        d: {
          code: { type: 'd', push: jest.fn(), config: {} },
          config: { require: ['consent'] },
        },
      },
    });

    expect(collector.sources['src'].config.require?.length || 0).toBe(0);

    await collector.command('run');
    const destInst = collector.destinations['d'];
    expect(destInst).toBeDefined();
    const consentDeliveriesRun1 = onSpy.mock.calls.filter(
      ([type]) => type === 'consent',
    ).length;

    await collector.command('run');

    // No duplicate registration and no extra consent delivery (high-water mark).
    expect(collector.destinations['d']).toBe(destInst);
    expect(Object.keys(collector.pending.destinations)).toHaveLength(0);
    const consentDeliveriesRun2 = onSpy.mock.calls.filter(
      ([type]) => type === 'consent',
    ).length;
    expect(consentDeliveriesRun2).toBe(consentDeliveriesRun1);
  });

  test('I12: reconcile-activated source emitting state terminates and stays bounded', async () => {
    const bOn = jest.fn();
    const { collector } = await startFlow({
      run: false,
      sources: {
        provider: {
          code: async (ctx: any): Promise<Source.Instance> => ({
            type: 'provider',
            config: {},
            push: ctx.env.elb,
            init: async () => {
              await ctx.env.command('consent', { marketing: true });
            },
          }),
        },
        a: {
          code: async (ctx: any): Promise<Source.Instance> => ({
            type: 'a',
            config: {},
            push: ctx.env.elb,
            on: async (type: On.Types): Promise<void> => {
              if (type === 'consent')
                await ctx.env.command('user', { id: 'u1' });
            },
          }),
          config: { require: ['consent'] },
        },
        b: {
          code: async (ctx: any): Promise<Source.Instance> => ({
            type: 'b',
            config: {},
            push: ctx.env.elb,
            on: bOn,
          }),
          config: { require: ['user'] },
        },
      },
      logger: { handler: () => undefined },
    });

    const errorSpy = jest.spyOn(collector.logger, 'error');

    // a activated by consent (presence); b still parked on user pre-run.
    expect(collector.sources['a'].config.require?.length || 0).toBe(0);
    expect(collector.sources['b'].config.require).toEqual(['user']);

    // Run barrier delivers consent to a → a emits user → reconcile activates b.
    await collector.command('run');

    expect(collector.user).toEqual(expect.objectContaining({ id: 'u1' }));
    expect(collector.sources['b'].config.require?.length || 0).toBe(0);

    const convergenceErrors = errorSpy.mock.calls.filter(
      ([message]) =>
        typeof message === 'string' &&
        message.toLowerCase().includes('did not converge'),
    );
    expect(convergenceErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });
});
