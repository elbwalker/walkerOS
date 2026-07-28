import { initGA4, pushGA4Event } from '../ga4';
import { resetLoadedScripts } from '../shared/gtag';
import { examples } from '../dev';
import { clone, createMockLogger, getEvent } from '@walkeros/core';
import type { GA4Settings } from '../types';

describe('GA4 Implementation', () => {
  const mockGtag = jest.fn();
  const mockEnv = clone(examples.env.push);
  mockEnv.window.gtag = mockGtag;

  // Create a mock logger that actually throws
  const createThrowingLogger = () => {
    const logger = createMockLogger();
    logger.throw = jest.fn((message: string | Error): never => {
      const msg = message instanceof Error ? message.message : message;
      throw new Error(msg);
    });
    return logger;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initGA4', () => {
    it('should throw error if no measurementId', () => {
      const settings: GA4Settings = { measurementId: '' };
      const logger = createThrowingLogger();

      expect(() => initGA4(settings, undefined, mockEnv, logger)).toThrow(
        'Config settings ga4.measurementId missing',
      );
    });

    // `js` announces that gtag was initialised here. When gtag already exists
    // an external tag manager bootstrapped it, usually much earlier, so a
    // second `js` carrying a later timestamp is a false initialisation signal.
    it('does NOT send js when gtag already exists, but still configures', () => {
      const settings: GA4Settings = { measurementId: 'G-XXXXXXXXXX' };

      initGA4(settings, true, mockEnv, createMockLogger(), true);

      expect(mockGtag).not.toHaveBeenCalledWith('js', expect.anything());
      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {});
    });

    it('sends js when walkerOS bootstraps gtag itself', () => {
      const env = clone(examples.env.init!); // gtag absent
      const dl: unknown[] = [];
      env.window.dataLayer = dl;

      initGA4({ measurementId: 'G-BOOTSTRAP' }, false, env, createMockLogger());

      const commands = dl.map((a) => (a as IArguments)[0]);
      expect(commands).toContain('js');
      expect(commands).toContain('config');
    });

    it('should initialize GA4 with transport_url', () => {
      const settings: GA4Settings = {
        measurementId: 'G-XXXXXXXXXX',
        transport_url: 'https://example.com/gtag',
      };

      initGA4(settings, false, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {
        transport_url: 'https://example.com/gtag',
      });
    });

    it('should initialize GA4 with server_container_url', () => {
      const settings: GA4Settings = {
        measurementId: 'G-XXXXXXXXXX',
        server_container_url: 'https://example.com/gtm',
      };

      initGA4(settings, false, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {
        server_container_url: 'https://example.com/gtm',
      });
    });

    it('should disable pageview when pageview is false', () => {
      const settings: GA4Settings = {
        measurementId: 'G-XXXXXXXXXX',
        pageview: false,
      };

      initGA4(settings, false, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {
        send_page_view: false,
      });
    });

    describe('gtag.js loading', () => {
      // Build an env whose document.createElement captures the injected script
      // so the resolved `script.src` can be asserted.
      const setupCapture = () => {
        resetLoadedScripts();
        type FakeScript = {
          src: string;
          onerror?: () => void;
          setAttribute: (name: string, value: string) => void;
          removeAttribute: (name: string) => void;
        };
        const created: FakeScript[] = [];
        const env = clone(examples.env.push);
        env.window.gtag = mockGtag;
        env.document.createElement = () => {
          const script: FakeScript = {
            src: '',
            setAttribute: () => {},
            removeAttribute: () => {},
          };
          created.push(script);
          return script;
        };
        return {
          env,
          getSrc: () => created[created.length - 1]?.src,
          countCreated: () => created.length,
          // Simulate the browser failing the most recently injected script.
          failScript: () => created[created.length - 1]?.onerror?.(),
        };
      };

      // First-party serving uses a tag serving path configured in the server
      // container, which maps to the measurement ID. It cannot be derived from
      // server_container_url, and per Google's docs the serving path must NOT
      // be part of server_container_url. So a server container alone never
      // changes where the script comes from.
      it('loads gtag.js from googletagmanager.com even when server_container_url is set', () => {
        const { env, getSrc } = setupCapture();
        const settings: GA4Settings = {
          measurementId: 'G-SERVERSIDE',
          server_container_url: 'https://sgtm.example.com',
        };

        initGA4(settings, true, env, createMockLogger());

        expect(getSrc()).toBe(
          'https://www.googletagmanager.com/gtag/js?id=G-SERVERSIDE',
        );
      });

      it('still routes measurement data to the server container', () => {
        const { env } = setupCapture();
        const settings: GA4Settings = {
          measurementId: 'G-SERVERSIDE',
          server_container_url: 'https://sgtm.example.com',
        };

        initGA4(settings, true, env, createMockLogger());

        expect(mockGtag).toHaveBeenCalledWith('config', 'G-SERVERSIDE', {
          server_container_url: 'https://sgtm.example.com',
        });
      });

      it('loads gtag.js from googletagmanager.com when server_container_url is absent', () => {
        const { env, getSrc } = setupCapture();
        const settings: GA4Settings = { measurementId: 'G-DEFAULT' };

        initGA4(settings, true, env, createMockLogger());

        expect(getSrc()).toBe(
          'https://www.googletagmanager.com/gtag/js?id=G-DEFAULT',
        );
      });

      // With `init: false` an external tag manager owns the gtag bootstrap.
      // walkerOS must not push `js` or `config`, and must not load the script,
      // so the container's own (earlier) config stays authoritative.
      it('skips the gtag bootstrap entirely when init is false', () => {
        const { env, getSrc } = setupCapture();
        const settings: GA4Settings = {
          measurementId: 'G-EXTERNAL',
          server_container_url: 'https://sgtm.example.com',
          init: false,
        };

        initGA4(settings, true, env, createMockLogger());

        expect(mockGtag).not.toHaveBeenCalledWith('js', expect.anything());
        expect(mockGtag).not.toHaveBeenCalledWith(
          'config',
          expect.anything(),
          expect.anything(),
        );
        expect(getSrc()).toBeUndefined();
      });

      it('still bootstraps when init is omitted (default true)', () => {
        const { env } = setupCapture();
        const settings: GA4Settings = { measurementId: 'G-DEFAULTINIT' };

        initGA4(settings, false, env, createMockLogger());

        expect(mockGtag).toHaveBeenCalledWith('config', 'G-DEFAULTINIT', {});
      });

      // https://developers.google.com/tag-platform/tag-manager/server-side/dependency-serving
      // The serving path maps to the measurement ID inside the container, so
      // the ID is NOT appended to the script URL. scriptSrc is used verbatim.
      it('uses scriptSrc verbatim, without appending the measurement ID', () => {
        const { env, getSrc } = setupCapture();
        const settings: GA4Settings = {
          measurementId: 'G-FIRSTPARTY',
          server_container_url: 'https://example.com/metrics',
          scriptSrc: 'https://example.com/metrics/tag_serving_path/',
        };

        initGA4(settings, true, env, createMockLogger());

        expect(getSrc()).toBe('https://example.com/metrics/tag_serving_path/');
      });

      it('falls back to googletagmanager.com when scriptSrc fails to load', () => {
        const { env, getSrc, failScript } = setupCapture();
        const settings: GA4Settings = {
          measurementId: 'G-FIRSTPARTY',
          scriptSrc: 'https://example.com/metrics/wrong_path/',
        };

        initGA4(settings, true, env, createMockLogger());
        expect(getSrc()).toBe('https://example.com/metrics/wrong_path/');

        failScript();

        expect(getSrc()).toBe(
          'https://www.googletagmanager.com/gtag/js?id=G-FIRSTPARTY',
        );
      });

      it('does not fall back twice when the fallback itself fails', () => {
        const { env, failScript, countCreated } = setupCapture();
        const settings: GA4Settings = {
          measurementId: 'G-FIRSTPARTY',
          scriptSrc: 'https://example.com/metrics/wrong_path/',
        };

        initGA4(settings, true, env, createMockLogger());
        failScript(); // first-party fails -> fallback injected
        failScript(); // fallback fails -> must not loop

        expect(countCreated()).toBe(2);
      });
    });
  });

  describe('pushGA4Event', () => {
    const mockEvent = getEvent('page view', {
      timestamp: 1234567890,
      id: 'test-id',
    });

    it('should throw error if no measurementId', () => {
      const settings: GA4Settings = { measurementId: '' };
      const logger = createThrowingLogger();

      expect(() =>
        pushGA4Event(mockEvent, settings, {}, mockEnv, logger),
      ).toThrow('Config settings ga4.measurementId missing');
    });

    it('should push event with snake_case name by default', () => {
      const settings: GA4Settings = { measurementId: 'G-TEST123' };

      pushGA4Event(
        mockEvent,
        settings,
        { value: 123.45 },
        mockEnv,
        createMockLogger(),
      );

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({
          send_to: 'G-TEST123',
          value: 123.45,
        }),
      );
    });

    it('should push event with custom data', () => {
      const settings: GA4Settings = { measurementId: 'G-TEST123' };

      pushGA4Event(
        mockEvent,
        settings,
        { price: 99.99, currency: 'USD' },
        mockEnv,
        createMockLogger(),
      );

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({
          send_to: 'G-TEST123',
          price: 99.99,
          currency: 'USD',
        }),
      );
    });

    it('should push event with debug mode enabled', () => {
      const settings: GA4Settings = {
        measurementId: 'G-TEST123',
        debug: true,
      };

      pushGA4Event(mockEvent, settings, {}, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({
          send_to: 'G-TEST123',
          debug_mode: true,
        }),
      );
    });

    it('should preserve original event name when snakeCase is disabled', () => {
      const settings: GA4Settings = {
        measurementId: 'G-TEST123',
        snakeCase: false,
      };

      pushGA4Event(mockEvent, settings, {}, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page view',
        expect.objectContaining({
          send_to: 'G-TEST123',
        }),
      );
    });
  });
});
