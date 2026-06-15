import { createMockLogger } from '@walkeros/core';
import {
  buildDetailFromServices,
  hasExplicitDecision,
  setupV2Adapter,
} from '../lib/v2';
import { parseConsent } from '../lib/parseConsent';
import type { Settings, UsercentricsV2Service } from '../types';
import {
  ConsentCall,
  createMockElb,
  createMockWindow,
  makeUcUi,
  makeV2Service,
  MockWindow,
} from './test-utils';

/**
 * Build a Settings object with defaults matching the source's own defaults.
 * Tests override per-case as needed.
 */
function buildSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    explicitOnly: true,
    categoryMap: {},
    apiVersion: 'auto',
    v3EventName: 'UC_UI_CMP_EVENT',
    ...overrides,
  };
}

describe('hasExplicitDecision', () => {
  test('returns true when any service has an explicit history entry', () => {
    const services: UsercentricsV2Service[] = [
      makeV2Service('essential', true, 'implicit'),
      makeV2Service('marketing', true, 'explicit'),
    ];
    expect(hasExplicitDecision(services)).toBe(true);
  });

  test('returns false when every history entry is implicit', () => {
    const services: UsercentricsV2Service[] = [
      makeV2Service('essential', true, 'implicit'),
      makeV2Service('marketing', false, 'implicit'),
    ];
    expect(hasExplicitDecision(services)).toBe(false);
  });

  test('returns false when history is missing or empty', () => {
    const services: UsercentricsV2Service[] = [
      { categorySlug: 'essential', consent: { status: true } },
      { categorySlug: 'marketing', consent: { status: false, history: [] } },
    ];
    expect(hasExplicitDecision(services)).toBe(false);
  });

  test('is case-insensitive on the type value', () => {
    // The live SDK can report the consent type in upper case ('EXPLICIT').
    // hasExplicitDecision lowercases before comparing, so an uppercase entry
    // still counts as an explicit decision. JSON-parse a fixture so the
    // uppercase value reaches the helper as a UsercentricsV2Service without a
    // literal-narrowing cast.
    const services: UsercentricsV2Service[] = JSON.parse(
      JSON.stringify([
        {
          categorySlug: 'marketing',
          consent: {
            status: true,
            history: [{ type: 'EXPLICIT', status: true }],
          },
        },
      ]),
    );
    expect(hasExplicitDecision(services)).toBe(true);
  });
});

describe('buildDetailFromServices', () => {
  test('explicit history → type explicit, strict-AND ucCategory, per-service name keys', () => {
    const services: UsercentricsV2Service[] = [
      makeV2Service('essential', true, 'explicit', 'Essential Cookie'),
      makeV2Service('marketing', true, 'explicit', 'Google Ads'),
      makeV2Service('marketing', false, 'implicit', 'Meta Pixel'),
    ];

    const detail = buildDetailFromServices(services);

    expect(detail.event).toBe('consent_status');
    expect(detail.type).toBe('explicit');
    // marketing has one denied service → category denied (strict AND).
    expect(detail.ucCategory).toEqual({ essential: true, marketing: false });
    expect(detail['Essential Cookie']).toBe(true);
    expect(detail['Google Ads']).toBe(true);
    expect(detail['Meta Pixel']).toBe(false);
  });

  test('only-implicit history → type implicit', () => {
    const services: UsercentricsV2Service[] = [
      makeV2Service('essential', true, 'implicit'),
      makeV2Service('marketing', false, 'implicit'),
    ];

    const detail = buildDetailFromServices(services);

    expect(detail.type).toBe('implicit');
    expect(detail.ucCategory).toEqual({ essential: true, marketing: false });
  });
});

describe('setupV2Adapter (official events)', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  function run(
    mockWindow: MockWindow,
    settings: Settings = buildSettings(),
  ): () => void {
    return setupV2Adapter({
      window: mockWindow as unknown as Window & typeof globalThis,
      elb: mockElb,
      settings,
      logger: createMockLogger(),
    });
  }

  test('UC_UI_INITIALIZED with explicit history publishes (default explicitOnly)', () => {
    const mockWindow = createMockWindow();
    mockWindow.__setUcUi(
      makeUcUi([
        makeV2Service('essential', true, 'explicit'),
        makeV2Service('marketing', false, 'explicit'),
      ]),
    );

    const cleanup = run(mockWindow);

    // The initial static read already published once because UC_UI is set.
    expect(mockElb).toHaveBeenCalledTimes(1);
    mockElb.mockClear();

    mockWindow.__dispatchInitialized();

    expect(mockElb).toHaveBeenCalledWith('walker consent', {
      essential: true,
      marketing: false,
    });
    expect(mockElb).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('UC_UI_INITIALIZED with only-implicit history (first visit) does NOT publish', () => {
    const mockWindow = createMockWindow();
    mockWindow.__setUcUi(
      makeUcUi([
        makeV2Service('essential', true, 'implicit'),
        makeV2Service('marketing', false, 'implicit'),
      ]),
    );

    const cleanup = run(mockWindow);
    mockWindow.__dispatchInitialized();

    expect(mockElb).not.toHaveBeenCalled();

    cleanup();
  });

  test('UC_UI_CMP_EVENT type ACCEPT_ALL re-reads and publishes', () => {
    const mockWindow = createMockWindow();
    mockWindow.__setUcUi(
      makeUcUi([
        makeV2Service('essential', true, 'explicit'),
        makeV2Service('marketing', true, 'explicit'),
      ]),
    );

    const cleanup = run(mockWindow);
    mockElb.mockClear();

    mockWindow.__dispatchCmpEvent({ source: 'button', type: 'ACCEPT_ALL' });

    expect(mockElb).toHaveBeenCalledWith('walker consent', {
      essential: true,
      marketing: true,
    });
    expect(mockElb).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('UC_UI_CMP_EVENT type CMP_SHOWN does NOT publish', () => {
    const mockWindow = createMockWindow();
    mockWindow.__setUcUi(
      makeUcUi([makeV2Service('marketing', true, 'explicit')]),
    );

    const cleanup = run(mockWindow);
    mockElb.mockClear();

    mockWindow.__dispatchCmpEvent({ source: 'first', type: 'CMP_SHOWN' });

    expect(mockElb).not.toHaveBeenCalled();

    cleanup();
  });

  test('static read at init (already initialized) with explicit history publishes the made choice', () => {
    const mockWindow = createMockWindow();
    mockWindow.__setUcUi(
      makeUcUi([
        makeV2Service('essential', true, 'explicit'),
        makeV2Service('marketing', false, 'explicit'),
      ]),
    );

    const cleanup = run(mockWindow);

    expect(mockElb).toHaveBeenCalledWith('walker consent', {
      essential: true,
      marketing: false,
    });
    expect(mockElb).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('explicitOnly=false publishes even an implicit static snapshot', () => {
    const mockWindow = createMockWindow();
    mockWindow.__setUcUi(
      makeUcUi([
        makeV2Service('essential', true, 'implicit'),
        makeV2Service('marketing', false, 'implicit'),
      ]),
    );

    const cleanup = run(mockWindow, buildSettings({ explicitOnly: false }));

    expect(mockElb).toHaveBeenCalledWith('walker consent', {
      essential: true,
      marketing: false,
    });
    expect(mockElb).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('strict AND across services in one category (one denied → category denied)', () => {
    const mockWindow = createMockWindow();
    mockWindow.__setUcUi(
      makeUcUi([
        makeV2Service('marketing', true, 'explicit'),
        makeV2Service('marketing', false, 'explicit'),
        makeV2Service('essential', true, 'explicit'),
      ]),
    );

    const cleanup = run(mockWindow);

    expect(mockElb).toHaveBeenCalledWith('walker consent', {
      essential: true,
      marketing: false,
    });
    expect(mockElb).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('service-level: per-service name keys carry through buildDetailFromServices into parseConsent', () => {
    // buildDetailFromServices surfaces each named service's status as a
    // top-level key. parseConsent reads those service-level keys whenever the
    // detail is service-level (ucCategory has a non-boolean entry), normalizing
    // the names to consent keys.
    const detail = buildDetailFromServices([
      makeV2Service('marketing', true, 'explicit', 'Google Analytics'),
      makeV2Service('marketing', false, 'explicit', 'Meta Pixel'),
    ]);

    expect(detail['Google Analytics']).toBe(true);
    expect(detail['Meta Pixel']).toBe(false);

    // Force parseConsent's service-level branch with a non-boolean ucCategory
    // entry so the top-level service keys are consumed.
    const serviceLevelDetail = {
      ...detail,
      ucCategory: { marketing: 'partial' },
    };
    const state = parseConsent(serviceLevelDetail, buildSettings());

    expect(state).toMatchObject({
      google_analytics: true,
      meta_pixel: false,
    });
  });

  test('cleanup removes both UC_UI_INITIALIZED and UC_UI_CMP_EVENT listeners', () => {
    const mockWindow = createMockWindow();
    mockWindow.__setUcUi(
      makeUcUi([makeV2Service('marketing', true, 'explicit')]),
    );

    const cleanup = run(mockWindow);
    cleanup();
    mockElb.mockClear();

    mockWindow.__dispatchInitialized();
    mockWindow.__dispatchCmpEvent({ source: 'button', type: 'ACCEPT_ALL' });

    expect(mockElb).not.toHaveBeenCalled();

    expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
      'UC_UI_INITIALIZED',
      expect.any(Function),
    );
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
      'UC_UI_CMP_EVENT',
      expect.any(Function),
    );

    cleanup();
  });
});
