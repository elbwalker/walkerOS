import { loadDestinationEnvs } from '../../commands/simulate/env-loader';

describe('loadDestinationEnvs', () => {
  it('loads env from destination packages', async () => {
    const destinations = {
      gtag: {
        package: '@walkeros/web-destination-gtag',
        config: { settings: { ga4: { measurementId: 'G-TEST' } } },
      },
    };

    const envs = await loadDestinationEnvs(destinations);

    expect(envs).toHaveProperty('gtag');
    expect(envs.gtag).toHaveProperty('push');
    expect(envs.gtag.push).toHaveProperty('window');
    expect(envs.gtag.push.window).toHaveProperty('gtag');
  });

  it('returns empty object for destinations without package field', async () => {
    const destinations = {
      custom: {
        config: {},
      },
    };

    const envs = await loadDestinationEnvs(destinations);

    expect(envs).toEqual({});
  });

  it('handles package import errors gracefully', async () => {
    const destinations = {
      invalid: {
        package: '@walkeros/nonexistent-package',
        config: {},
      },
    };

    const envs = await loadDestinationEnvs(destinations);

    expect(envs).toEqual({});
  });

  it('loads simulation tracking paths', async () => {
    const destinations = {
      gtag: {
        package: '@walkeros/web-destination-gtag',
        config: {},
      },
    };

    const envs = await loadDestinationEnvs(destinations);

    expect(envs.gtag).toHaveProperty('simulation');
    expect(Array.isArray(envs.gtag.simulation)).toBe(true);
  });
});
