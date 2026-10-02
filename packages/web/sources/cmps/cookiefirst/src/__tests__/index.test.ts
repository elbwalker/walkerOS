import { sourceCookieFirst, DEFAULT_CATEGORY_MAP } from '../index';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { Source } from '@walkeros/core';
import type { Types } from '../types';
import * as inputs from '../examples/inputs';
import * as outputs from '../examples/outputs';
import { examples } from '../dev';
import {
  createMockElb,
  createMockWindow,
  createCookieFirstSource,
  resetMockWindow,
  ConsentCall,
} from './test-utils';

/** A scope binder for a source that never binds a scope. */
const withScopeFor =
  (env: Types['env']): Source.Context<Types>['withScope'] =>
  async (_r, respond, body) =>
    body({ ...env, ingest: createIngest('test-cookiefirst'), respond });

describe('CookieFirst Source', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  afterEach(() => {
    resetMockWindow();
  });

  describe('initialization', () => {
    test('initializes without errors', async () => {
      const { window: mockWindow } = createMockWindow();

      await expect(
        createCookieFirstSource(mockWindow, mockElb),
      ).resolves.not.toThrow();
    });

    test('returns correct source type', async () => {
      const { window: mockWindow } = createMockWindow();
      const source = await createCookieFirstSource(mockWindow, mockElb);

      expect(source.type).toBe('cookiefirst');
    });

    test('uses default settings when none provided', async () => {
      const { window: mockWindow } = createMockWindow();
      const source = await createCookieFirstSource(mockWindow, mockElb);

      expect(source.config.settings?.categoryMap).toEqual(DEFAULT_CATEGORY_MAP);
      expect(source.config.settings?.explicitOnly).toBe(true);
      expect(source.config.settings?.globalName).toBe('CookieFirst');
    });

    test('merges custom settings with defaults', async () => {
      const { window: mockWindow } = createMockWindow();
      const source = await createCookieFirstSource(mockWindow, mockElb, {
        settings: {
          categoryMap: { performance: 'statistics' },
          explicitOnly: false,
        },
      });

      // Custom mapping should override default
      expect(source.config.settings?.categoryMap?.performance).toBe(
        'statistics',
      );
      // Other defaults should remain
      expect(source.config.settings?.categoryMap?.advertising).toBe(
        'marketing',
      );
      expect(source.config.settings?.explicitOnly).toBe(false);
    });
  });

  describe('existing consent processing', () => {
    test('processes existing consent on initialization', async () => {
      const { window: mockWindow } = createMockWindow(inputs.fullConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('does not process null consent with explicitOnly=true', async () => {
      const { window: mockWindow } = createMockWindow(null);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(0);
    });

    test('processes null consent with explicitOnly=false', async () => {
      const { window: mockWindow } = createMockWindow(null);

      await createCookieFirstSource(mockWindow, mockElb, {
        settings: { explicitOnly: false },
      });

      // Still no calls because null has no categories to map
      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('category mapping', () => {
    test('maps minimal consent correctly', async () => {
      const { window: mockWindow } = createMockWindow(inputs.minimalConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);
    });

    test('maps analytics only consent correctly', async () => {
      const { window: mockWindow } = createMockWindow(
        inputs.analyticsOnlyConsent,
      );

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.analyticsOnlyMapped);
    });

    test('maps marketing only consent correctly', async () => {
      const { window: mockWindow } = createMockWindow(
        inputs.marketingOnlyConsent,
      );

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.marketingOnlyMapped);
    });

    test('uses custom category mapping', async () => {
      const { window: mockWindow } = createMockWindow(inputs.fullConsent);

      await createCookieFirstSource(mockWindow, mockElb, {
        settings: {
          categoryMap: {
            necessary: 'essential',
            functional: 'essential',
            performance: 'statistics',
            advertising: 'ads',
          },
        },
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        statistics: true,
        ads: true,
      });
    });

    test('passes through unmapped categories', async () => {
      const customConsent = {
        necessary: true,
        custom_category: true,
      };
      const { window: mockWindow } = createMockWindow(customConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        custom_category: true,
      });
    });
  });

  describe('event handling', () => {
    test('handles cf_init event', async () => {
      const {
        window: mockWindow,
        dispatch,
        setConsent,
      } = createMockWindow(null);

      await createCookieFirstSource(mockWindow, mockElb);

      // No consent yet
      expect(consentCalls).toHaveLength(0);

      // Simulate CMP loading and user accepting
      setConsent(inputs.fullConsent);
      dispatch('cf_init');

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles cf_consent event', async () => {
      const { window: mockWindow, dispatch } = createMockWindow(
        inputs.minimalConsent,
      );

      await createCookieFirstSource(mockWindow, mockElb);

      // Initial consent
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);

      // User updates consent
      dispatch('cf_consent', inputs.fullConsent);

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles multiple consent changes', async () => {
      const { window: mockWindow, dispatch } = createMockWindow(
        inputs.minimalConsent,
      );

      await createCookieFirstSource(mockWindow, mockElb);

      // Initial
      expect(consentCalls).toHaveLength(1);

      // First change
      dispatch('cf_consent', inputs.partialConsent);
      expect(consentCalls).toHaveLength(2);

      // Second change
      dispatch('cf_consent', inputs.fullConsent);
      expect(consentCalls).toHaveLength(3);

      expect(consentCalls[2].consent).toEqual(outputs.fullConsentMapped);
    });
  });

  describe('custom global name', () => {
    test('uses custom global name', async () => {
      const { window: mockWindow } = createMockWindow(
        inputs.fullConsent,
        'MyCMP',
      );

      await createCookieFirstSource(mockWindow, mockElb, {
        settings: { globalName: 'MyCMP' },
      });

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });
  });

  describe('cleanup', () => {
    test('destroy removes event listeners', async () => {
      const { window: mockWindow } = createMockWindow(inputs.fullConsent);

      const source = await createCookieFirstSource(mockWindow, mockElb);

      // Initial consent processed
      expect(consentCalls).toHaveLength(1);

      // Destroy the source
      await source.destroy?.({
        id: 'test',
        config: source.config,
        env: {
          push: mockElb,
          command: mockElb,
          elb: mockElb,
          window: mockWindow,
          logger: createMockLogger(),
        },
        logger: createMockLogger(),
      });

      // Verify removeEventListener was called
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'cf_init',
        expect.any(Function),
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'cf_consent',
        expect.any(Function),
      );
    });
  });

  describe('no window environment', () => {
    test('handles missing window gracefully', async () => {
      const env: Types['env'] = {
        push: mockElb,
        command: mockElb,
        elb: mockElb,
        window: undefined,
        logger: {
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          json: () => {},
          throw: (m: string | Error) => {
            throw typeof m === 'string' ? new Error(m) : m;
          },
          scope: function () {
            return this;
          },
        },
      };
      const { collector } = await startFlow({ run: false });
      const source = await sourceCookieFirst({
        collector,
        config: {},
        env,
        id: 'test-cookiefirst',
        logger: {
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          json: () => {},
          throw: (m: string | Error) => {
            throw typeof m === 'string' ? new Error(m) : m;
          },
          scope: function () {
            return this;
          },
        },
        withScope: withScopeFor(env),
      });

      expect(source.type).toBe('cookiefirst');
      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('factory side-effect-free (init hygiene)', () => {
    test('factory attaches no listener and emits no consent until init() runs', async () => {
      // CookieFirst already loaded with consent: a static read WOULD emit if
      // the factory performed it.
      const { window: mockWindow } = createMockWindow({ necessary: true });

      const env: Types['env'] = {
        push: mockElb,
        command: mockElb,
        elb: mockElb,
        window: mockWindow,
        logger: createMockLogger(),
      };
      const { collector } = await startFlow({ run: false });

      const source = await sourceCookieFirst({
        collector,
        config: { settings: { explicitOnly: false } },
        env,
        id: 'test-cookiefirst',
        logger: createMockLogger(),
        withScope: withScopeFor(env),
      });

      // Pass-1 factory must be side-effect-free: no listener, no consent emit.
      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
      expect(consentCalls).toHaveLength(0);

      // init() (Pass 2) attaches listeners and performs the static read.
      await source.init?.();

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'cf_consent',
        expect.any(Function),
      );
      expect(consentCalls).toHaveLength(1);
    });
  });
});
