import { sourceUsercentrics } from '../index';
import * as inputs from '../examples/inputs';
import * as outputs from '../examples/outputs';
import {
  createMockElb,
  createMockWindow,
  createUsercentricsSource,
  ConsentCall,
} from './test-utils';

describe('Usercentrics Source', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  describe('initialization', () => {
    test('initializes without errors', async () => {
      const mockWindow = createMockWindow();

      await expect(
        createUsercentricsSource(mockWindow, mockElb),
      ).resolves.not.toThrow();
    });

    test('returns correct source type', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb);

      expect(source.type).toBe('usercentrics');
    });

    test('uses default settings when none provided', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb);

      expect(source.config.settings?.eventName).toBe('ucEvent');
      expect(source.config.settings?.explicitOnly).toBe(true);
      expect(source.config.settings?.categoryMap).toEqual({});
    });

    test('merges custom settings with defaults', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          eventName: 'myConsentEvent',
          explicitOnly: false,
          categoryMap: { essential: 'functional' },
        },
      });

      expect(source.config.settings?.eventName).toBe('myConsentEvent');
      expect(source.config.settings?.explicitOnly).toBe(false);
      expect(source.config.settings?.categoryMap).toEqual({
        essential: 'functional',
      });
    });

    test('registers event listener on configured event name', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'ucEvent',
        expect.any(Function),
      );
    });

    test('registers listener on custom event name', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { eventName: 'UC_SDK_EVENT' },
      });

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'UC_SDK_EVENT',
        expect.any(Function),
      );
    });
  });

  describe('explicit consent filtering', () => {
    test('processes explicit consent events', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);

      expect(consentCalls).toHaveLength(1);
    });

    test('processes explicit consent with uppercase type', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsentUpperCase);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('ignores implicit consent when explicitOnly=true', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.implicitConsent);

      expect(consentCalls).toHaveLength(0);
    });

    test('processes implicit consent when explicitOnly=false', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { explicitOnly: false },
      });

      mockWindow.__dispatchEvent('ucEvent', inputs.implicitConsent);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);
    });
  });

  describe('non-consent event filtering', () => {
    test('ignores non-consent_status events', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.nonConsentEvent);

      expect(consentCalls).toHaveLength(0);
    });

    test('ignores events without detail', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      // Dispatch event with no detail
      mockWindow.__dispatchEvent('ucEvent');

      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('group-level consent (ucCategory)', () => {
    test('maps full consent correctly', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);

      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('maps partial consent correctly', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.partialConsent);

      expect(consentCalls[0].consent).toEqual(outputs.partialConsentMapped);
    });

    test('maps minimal consent correctly', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.minimalConsent);

      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);
    });

    test('applies custom category mapping', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          categoryMap: {
            essential: 'functional',
            functional: 'functional',
            marketing: 'marketing',
          },
        },
      });

      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);

      expect(consentCalls[0].consent).toEqual(outputs.fullConsentCustomMapped);
    });

    test('passes through unmapped categories', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: {
          essential: true,
          custom_group: true,
        },
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        custom_group: true,
      });
    });

    test('uses OR logic when multiple categories map to same group', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          categoryMap: {
            essential: 'functional',
            functional: 'functional',
          },
        },
      });

      // essential=true, functional=false both map to 'functional'
      // OR logic: true OR false = true
      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: {
          essential: true,
          functional: false,
          marketing: false,
        },
      });

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        marketing: false,
      });
    });
  });

  describe('service-level consent', () => {
    test('extracts individual services when ucCategory has non-boolean values', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.serviceLevelConsent);

      expect(consentCalls[0].consent).toEqual(outputs.serviceLevelMapped);
    });

    test('normalizes service names to lowercase with underscores', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: { essential: 'partial' },
        'My Custom Service': true,
      });

      expect(consentCalls[0].consent).toHaveProperty('my_custom_service', true);
    });

    test('merges boolean ucCategory entries with service keys', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      // ucCategory has mix of boolean and non-boolean
      // Boolean entries from ucCategory should be included
      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: {
          essential: true, // boolean - include
          marketing: 'partial', // non-boolean - skip (use services)
        },
        'Facebook Pixel': true,
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        facebook_pixel: true,
      });
    });

    test('applies categoryMap to boolean ucCategory entries in service-level mode', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          categoryMap: { essential: 'functional' },
        },
      });

      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: {
          essential: true, // boolean - mapped to 'functional'
          marketing: 'partial', // non-boolean - skipped
        },
        'Facebook Pixel': true,
      });

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        facebook_pixel: true,
      });
    });
  });

  describe('event handling', () => {
    test('handles consent change events', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      // First consent
      mockWindow.__dispatchEvent('ucEvent', inputs.minimalConsent);
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);

      // User updates consent
      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);
      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles consent withdrawal (revocation)', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      // User initially accepts all
      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);

      // User revokes marketing
      mockWindow.__dispatchEvent('ucEvent', inputs.partialConsent);
      expect(consentCalls[1].consent).toEqual(outputs.partialConsentMapped);
    });

    test('handles multiple consent changes', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.minimalConsent);
      mockWindow.__dispatchEvent('ucEvent', inputs.partialConsent);
      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);

      expect(consentCalls).toHaveLength(3);
      expect(consentCalls[2].consent).toEqual(outputs.fullConsentMapped);
    });
  });

  describe('cleanup', () => {
    test('destroy removes event listener', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb);

      await source.destroy?.();

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'ucEvent',
        expect.any(Function),
      );
    });

    test('destroy removes listener for custom event name', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb, {
        settings: { eventName: 'myConsentEvent' },
      });

      await source.destroy?.();

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'myConsentEvent',
        expect.any(Function),
      );
    });
  });

  describe('no window environment', () => {
    test('handles missing window gracefully', async () => {
      const source = await sourceUsercentrics({
        collector: {} as never,
        config: {},
        env: {
          push: mockElb,
          command: mockElb,
          elb: mockElb,
          window: undefined,
          logger: {
            error: () => {},
            info: () => {},
            debug: () => {},
            throw: (m: string | Error) => {
              throw typeof m === 'string' ? new Error(m) : m;
            },
            scope: function () {
              return this;
            },
          },
        },
        id: 'test-usercentrics',
        logger: {
          error: () => {},
          info: () => {},
          debug: () => {},
          throw: (m: string | Error) => {
            throw typeof m === 'string' ? new Error(m) : m;
          },
          scope: function () {
            return this;
          },
        },
        setIngest: async () => {},
      });

      expect(source.type).toBe('usercentrics');
      expect(consentCalls).toHaveLength(0);
    });
  });
});
