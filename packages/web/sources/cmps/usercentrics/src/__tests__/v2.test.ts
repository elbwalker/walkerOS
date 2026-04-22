import { createMockLogger } from '@walkeros/core';
import { setupV2Adapter } from '../lib/v2';
import type { Settings, UsercentricsV2Service } from '../types';
import {
  ConsentCall,
  createMockElb,
  createMockWindow,
  MockWindow,
} from './test-utils';

/**
 * Build a Settings object with defaults matching the source's own defaults.
 * Tests override per-case as needed.
 */
function buildSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    eventName: 'ucEvent',
    explicitOnly: true,
    categoryMap: {},
    apiVersion: 'auto',
    v3EventName: 'UC_UI_CMP_EVENT',
    ...overrides,
  };
}

/**
 * Attach a UC_UI mock onto the MockWindow.
 * We cast to a local-typed shape rather than mutating `unknown` so the typing
 * stays explicit for each test.
 */
function withUcUi(
  mockWindow: MockWindow,
  ucUi: {
    isInitialized?: () => boolean;
    getServicesBaseInfo?: () => UsercentricsV2Service[];
  },
): void {
  (mockWindow as unknown as { UC_UI: typeof ucUi }).UC_UI = ucUi;
}

describe('V2 adapter (setupV2Adapter)', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  describe('post-init static read', () => {
    test('aggregates services by categorySlug with OR logic', () => {
      const mockWindow = createMockWindow();
      const services: UsercentricsV2Service[] = [
        { categorySlug: 'essential', consent: { status: true } },
        { categorySlug: 'marketing', consent: { status: true } },
        { categorySlug: 'marketing', consent: { status: false } },
        { categorySlug: 'functional', consent: { status: false } },
      ];
      withUcUi(mockWindow, {
        isInitialized: () => true,
        getServicesBaseInfo: () => services,
      });

      const cleanup = setupV2Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
        marketing: true,
        functional: false,
      });
      expect(mockElb).toHaveBeenCalledTimes(1);

      cleanup();
    });

    test('skips static read when UC_UI.isInitialized() returns false', () => {
      const mockWindow = createMockWindow();
      withUcUi(mockWindow, {
        isInitialized: () => false,
        getServicesBaseInfo: () => [
          { categorySlug: 'essential', consent: { status: true } },
        ],
      });

      const cleanup = setupV2Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      expect(mockElb).not.toHaveBeenCalled();

      cleanup();
    });

    test('skips static read when UC_UI is absent', () => {
      const mockWindow = createMockWindow();
      // No UC_UI attached.

      const cleanup = setupV2Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      expect(mockElb).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe('pre-init event listener', () => {
    test('handles ucEvent dispatched after registration', () => {
      const mockWindow = createMockWindow();
      // No UC_UI — simulate pre-init environment.

      const cleanup = setupV2Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: { essential: true, marketing: false },
      });

      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
        marketing: false,
      });
      expect(mockElb).toHaveBeenCalledTimes(1);

      cleanup();
    });

    test('respects custom eventName setting', () => {
      const mockWindow = createMockWindow();

      const cleanup = setupV2Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings({ eventName: 'UC_SDK_EVENT' }),
        logger: createMockLogger(),
      });

      mockWindow.__dispatchEvent('UC_SDK_EVENT', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: { essential: true, marketing: false },
      });

      expect(mockElb).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
        marketing: false,
      });

      cleanup();
    });
  });

  describe('cleanup', () => {
    test('cleanup removes the event listener', () => {
      const mockWindow = createMockWindow();

      const cleanup = setupV2Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      cleanup();

      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: { essential: true, marketing: false },
      });

      expect(mockElb).not.toHaveBeenCalled();
    });
  });
});
