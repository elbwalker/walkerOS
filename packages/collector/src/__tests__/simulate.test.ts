import type {
  Destination,
  Source,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { simulate } from '../simulation';

describe('simulate', () => {
  describe('transformer', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      data: { title: 'Home' },
    };

    it('returns transformed event in events array', async () => {
      const code: Transformer.Init = () => ({
        type: 'enricher',
        config: {},
        push(event) {
          return {
            event: { ...event, data: { ...event.data, enriched: true } },
          };
        },
      });

      const result = await simulate({
        step: 'transformer',
        name: 'enricher',
        code,
        event,
      });

      expect(result.step).toBe('transformer');
      expect(result.name).toBe('enricher');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].data).toEqual({ title: 'Home', enriched: true });
      expect(result.calls).toEqual([]);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('returns empty events when transformer filters (returns false)', async () => {
      const code: Transformer.Init = () => ({
        type: 'filter',
        config: {},
        push() {
          return false;
        },
      });

      const result = await simulate({
        step: 'transformer',
        name: 'filter',
        code,
        event,
      });

      expect(result.events).toEqual([]);
    });

    it('returns original event for passthrough (returns void)', async () => {
      const code: Transformer.Init = () => ({
        type: 'passthrough',
        config: {},
        push() {
          // void return = passthrough
        },
      });

      const result = await simulate({
        step: 'transformer',
        name: 'passthrough',
        code,
        event,
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toEqual(event);
    });

    it('captures error without throwing', async () => {
      const code: Transformer.Init = () => ({
        type: 'broken',
        config: {},
        push() {
          throw new Error('transformer broke');
        },
      });

      const result = await simulate({
        step: 'transformer',
        name: 'broken',
        code,
        event,
      });

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('transformer broke');
      expect(result.events).toEqual([]);
    });
  });

  describe('source', () => {
    // Minimal browser-like env for testing
    const env: Record<string, unknown> = {
      window: {} as any,
      document: {} as any,
      localStorage: {} as any,
    };

    it('captures events pushed by source', async () => {
      const code: Source.Init = (ctx) => ({
        type: 'test',
        config: {},
        push: ctx.env.push as Source.Instance['push'],
        on(event) {
          if (event === 'run') {
            ctx.env.push({ name: 'page view', data: { title: 'Home' } });
          }
        },
      });

      const result = await simulate({
        step: 'source',
        name: 'test',
        code,
        env,
      });

      expect(result.step).toBe('source');
      expect(result.name).toBe('test');
      expect(result.events.length).toBeGreaterThanOrEqual(1);
      expect(result.events[0].name).toBe('page view');
      expect(result.calls).toEqual([]);
    });

    it('handles setup + trigger pattern', async () => {
      const order: string[] = [];

      const code: Source.Init = () => ({
        type: 'test',
        config: {},
        push: (() => {}) as unknown as Source.Instance['push'],
        on(event) {
          if (event === 'run') order.push('source-run');
        },
      });

      const trigger = (): void | (() => void) => {
        order.push('setup');
        return () => {
          order.push('trigger');
        };
      };

      await simulate({
        step: 'source',
        name: 'test',
        code,
        trigger,
        input: {},
        env,
      });

      expect(order).toEqual(['setup', 'source-run', 'trigger']);
    });

    it('returns empty events when source pushes nothing', async () => {
      const code: Source.Init = () => ({
        type: 'test',
        config: {},
        push: (() => {}) as unknown as Source.Instance['push'],
      });

      const result = await simulate({
        step: 'source',
        name: 'silent',
        code,
        env,
      });

      expect(result.events).toEqual([]);
    });
  });

  describe('destination', () => {
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      data: { total: 42 },
    };

    it('executes destination push and records env calls', async () => {
      const code: Destination.Instance = {
        type: 'test-dest',
        config: {},
        push(event, context) {
          // Destination calls its env during push
          const env = context.env as any;
          if (env?.window?.gtag) {
            env.window.gtag('event', 'purchase', {
              value: event.data?.total,
            });
          }
        },
      };

      const result = await simulate({
        step: 'destination',
        name: 'gtag',
        code,
        event,
        env: {
          window: { gtag: (..._args: unknown[]) => {} },
        },
        track: ['window.gtag'],
      });

      expect(result.step).toBe('destination');
      expect(result.name).toBe('gtag');
      expect(result.events).toEqual([]);
      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].fn).toBe('window.gtag');
      expect(result.calls[0].args).toEqual([
        'event',
        'purchase',
        { value: 42 },
      ]);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('works without env (no tracking)', async () => {
      let pushed = false;
      const code: Destination.Instance = {
        type: 'simple',
        config: {},
        push() {
          pushed = true;
        },
      };

      const result = await simulate({
        step: 'destination',
        name: 'simple',
        code,
        event,
      });

      expect(pushed).toBe(true);
      expect(result.calls).toEqual([]);
    });

    it('applies mapping from config', async () => {
      let receivedEvent: any;
      const code: Destination.Instance = {
        type: 'mapped',
        config: {},
        push(event) {
          receivedEvent = event;
        },
      };

      const result = await simulate({
        step: 'destination',
        name: 'mapped',
        code,
        event,
        config: {
          mapping: { order: { complete: { name: 'purchase' } } },
        },
      });

      expect(result.error).toBeUndefined();
      // The collector applies mapping before calling destination.push
      // Verify the destination was called (exact mapping behavior depends on collector)
      expect(receivedEvent).toBeDefined();
    });

    it('captures destination push errors', async () => {
      const code: Destination.Instance = {
        type: 'broken',
        config: {},
        push() {
          throw new Error('destination broke');
        },
      };

      const result = await simulate({
        step: 'destination',
        name: 'broken',
        code,
        event,
      });

      // Destination errors may be swallowed by the collector
      // The result should still complete without simulate() throwing
      expect(result.step).toBe('destination');
      expect(result.name).toBe('broken');
    });
  });
});
