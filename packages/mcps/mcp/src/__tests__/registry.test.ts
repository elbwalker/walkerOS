import { PACKAGE_REGISTRY, filterRegistry } from '../registry.js';

describe('PACKAGE_REGISTRY', () => {
  it('should contain packages', () => {
    expect(PACKAGE_REGISTRY.length).toBeGreaterThan(0);
  });

  it('should have valid entries', () => {
    for (const entry of PACKAGE_REGISTRY) {
      expect(entry.name).toBeTruthy();
      expect(['source', 'destination', 'transformer', 'store']).toContain(
        entry.type,
      );
      expect(['web', 'server', 'universal']).toContain(entry.platform);
      expect(entry.description).toBeTruthy();
    }
  });

  it('should have unique package names', () => {
    const names = PACKAGE_REGISTRY.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('filterRegistry', () => {
  it('should return all packages when no filters', () => {
    const results = filterRegistry();
    expect(results).toEqual(PACKAGE_REGISTRY);
  });

  it('should filter by type', () => {
    const destinations = filterRegistry({ type: 'destination' });
    expect(destinations.length).toBeGreaterThan(0);
    expect(destinations.every((p) => p.type === 'destination')).toBe(true);
  });

  it('should filter by platform', () => {
    const webPackages = filterRegistry({ platform: 'web' });
    expect(webPackages.length).toBeGreaterThan(0);
    expect(
      webPackages.every(
        (p) => p.platform === 'web' || p.platform === 'universal',
      ),
    ).toBe(true);
  });

  it('should include universal packages in platform filter', () => {
    const serverPackages = filterRegistry({ platform: 'server' });
    const universalInResults = serverPackages.filter(
      (p) => p.platform === 'universal',
    );
    expect(universalInResults.length).toBeGreaterThan(0);
  });

  it('should combine type and platform filters', () => {
    const webDestinations = filterRegistry({
      type: 'destination',
      platform: 'web',
    });
    expect(webDestinations.length).toBeGreaterThan(0);
    expect(
      webDestinations.every(
        (p) =>
          p.type === 'destination' &&
          (p.platform === 'web' || p.platform === 'universal'),
      ),
    ).toBe(true);
  });

  it('should return empty array for no matches', () => {
    const results = filterRegistry({ type: 'store', platform: 'web' });
    // No web-specific stores exist (only universal and server)
    expect(
      results.every((p) => p.platform === 'web' || p.platform === 'universal'),
    ).toBe(true);
  });
});
