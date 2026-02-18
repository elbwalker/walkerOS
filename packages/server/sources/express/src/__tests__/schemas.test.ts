import { SettingsSchema } from '../schemas';

describe('SettingsSchema', () => {
  describe('paths', () => {
    it('should accept string shorthand', () => {
      const result = SettingsSchema.parse({ paths: ['/collect'] });
      expect(result.paths).toEqual(['/collect']);
    });

    it('should accept RouteConfig objects', () => {
      const result = SettingsSchema.parse({
        paths: [{ path: '/collect', methods: ['GET'] }],
      });
      expect(result.paths).toEqual([{ path: '/collect', methods: ['GET'] }]);
    });

    it('should accept mixed string and RouteConfig', () => {
      const result = SettingsSchema.parse({
        paths: [
          '/collect',
          { path: '/ingest', methods: ['POST'] },
          { path: '/webhooks/*', methods: ['POST'] },
        ],
      });
      expect(result.paths).toHaveLength(3);
    });

    it('should accept omitted paths', () => {
      const result = SettingsSchema.parse({});
      expect(result.paths).toBeUndefined();
    });

    it('should reject empty paths array', () => {
      expect(() => SettingsSchema.parse({ paths: [] })).toThrow();
    });

    it('should reject invalid methods', () => {
      expect(() =>
        SettingsSchema.parse({
          paths: [{ path: '/x', methods: ['DELETE'] }],
        }),
      ).toThrow();
    });

    it('should accept RouteConfig without methods (defaults to GET+POST)', () => {
      const result = SettingsSchema.parse({
        paths: [{ path: '/data' }],
      });
      expect(result.paths).toEqual([{ path: '/data' }]);
    });
  });

  describe('deprecated path field', () => {
    it('should accept deprecated path string', () => {
      const result = SettingsSchema.parse({ path: '/events' });
      expect(result.path).toBe('/events');
    });

    it('should accept both path and paths', () => {
      const result = SettingsSchema.parse({
        path: '/old',
        paths: ['/new'],
      });
      expect(result.paths).toEqual(['/new']);
      expect(result.path).toBe('/old');
    });
  });
});
