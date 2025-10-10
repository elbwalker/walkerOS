import { startFlow } from '..';

describe('Auto-run functionality', () => {
  describe('startFlow auto-run behavior', () => {
    test('auto-runs by default (collector.allowed should be true)', async () => {
      const { collector } = await startFlow();

      // Default behavior should auto-run and set allowed to true
      expect(collector.allowed).toBe(true);
      expect(collector.config.run).toBe(true);
    });

    test('auto-runs when explicitly set to true (collector.allowed should be true)', async () => {
      const { collector } = await startFlow({ run: true });

      // Explicitly setting run: true should auto-run and set allowed to true
      expect(collector.allowed).toBe(true);
      expect(collector.config.run).toBe(true);
    });

    test('does not auto-run when set to false (collector.allowed should be false)', async () => {
      const { collector } = await startFlow({ run: false });

      // Setting run: false should NOT auto-run and allowed should stay false
      expect(collector.allowed).toBe(false);
      expect(collector.config.run).toBe(false);
    });

    test('manual run after initialization with run: false should set allowed to true', async () => {
      const { collector, elb } = await startFlow({ run: false });

      // Initially should not be allowed
      expect(collector.allowed).toBe(false);

      // Manual run should set allowed to true
      await elb('walker run');
      expect(collector.allowed).toBe(true);
    });

    test('config state is preserved correctly for different run values', async () => {
      // Test with run: true
      const collectorTrue = await startFlow({ run: true, verbose: true });
      expect(collectorTrue.collector.config.run).toBe(true);
      expect(collectorTrue.collector.config.verbose).toBe(true);
      expect(collectorTrue.collector.allowed).toBe(true);

      // Test with run: false
      const collectorFalse = await startFlow({
        run: false,
        verbose: true,
      });
      expect(collectorFalse.collector.config.run).toBe(false);
      expect(collectorFalse.collector.config.verbose).toBe(true);
      expect(collectorFalse.collector.allowed).toBe(false);
    });
  });

  describe('auto-run with additional configuration', () => {
    test('applies consent during auto-run', async () => {
      const testConsent = { functional: true, marketing: false };
      const { collector } = await startFlow({
        run: true,
        consent: testConsent,
      });

      expect(collector.allowed).toBe(true);
      expect(collector.consent).toEqual(testConsent);
    });

    test('applies user data during auto-run', async () => {
      const testUser = { id: 'test-user-123', custom: { type: 'premium' } };
      const { collector } = await startFlow({
        run: true,
        user: testUser,
      });

      expect(collector.allowed).toBe(true);
      expect(collector.user).toEqual(testUser);
    });

    test('applies globals during auto-run', async () => {
      const testGlobals = { page_title: 'Test Page', environment: 'test' };
      const { collector } = await startFlow({
        run: true,
        globals: testGlobals,
      });

      expect(collector.allowed).toBe(true);
      expect(collector.globals).toEqual(expect.objectContaining(testGlobals));
    });

    test('applies custom data during auto-run', async () => {
      const testCustom = { tracking_id: 'GTM-12345', debug: true };
      const { collector } = await startFlow({
        run: true,
        custom: testCustom,
      });

      expect(collector.allowed).toBe(true);
      expect(collector.custom).toEqual(testCustom);
    });

    test('does not apply additional config when run: false', async () => {
      const testConsent = { functional: true, marketing: false };
      const testUser = { id: 'test-user-123' };
      const testGlobals = { page_title: 'Test Page' };
      const testCustom = { tracking_id: 'GTM-12345' };

      const { collector } = await startFlow({
        run: false,
        consent: testConsent,
        user: testUser,
        globals: testGlobals,
        custom: testCustom,
      });

      // Should not be allowed since we didn't run
      expect(collector.allowed).toBe(false);

      // But the config should still be stored for potential later use
      expect(collector.consent).toEqual(testConsent);
      expect(collector.user).toEqual(testUser);
      expect(collector.globals).toEqual(expect.objectContaining(testGlobals));
      expect(collector.custom).toEqual(testCustom);
    });
  });
});
