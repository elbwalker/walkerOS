import { resolveTelemetryEndpoint } from '../emitter.js';
import { resolveAppUrl } from '../../lib/config-file.js';

jest.mock('../../lib/config-file.js', () => ({
  resolveAppUrl: jest.fn(),
}));

const mockResolveAppUrl = jest.mocked(resolveAppUrl);

describe('resolveTelemetryEndpoint', () => {
  afterEach(() => {
    mockResolveAppUrl.mockReset();
  });

  it('appends /api/telemetry to the resolved app URL', () => {
    mockResolveAppUrl.mockReturnValue('https://app.example.com');
    expect(resolveTelemetryEndpoint()).toBe(
      'https://app.example.com/api/telemetry',
    );
  });

  it('strips trailing slash on the app URL', () => {
    mockResolveAppUrl.mockReturnValue('https://app.example.com/');
    expect(resolveTelemetryEndpoint()).toBe(
      'https://app.example.com/api/telemetry',
    );
  });

  it('preserves a sub-path on the app URL', () => {
    mockResolveAppUrl.mockReturnValue('https://app.example.com/walkeros');
    expect(resolveTelemetryEndpoint()).toBe(
      'https://app.example.com/walkeros/api/telemetry',
    );
  });

  it('returns undefined when resolveAppUrl returns empty string', () => {
    mockResolveAppUrl.mockReturnValue('');
    expect(resolveTelemetryEndpoint()).toBeUndefined();
  });

  it('does NOT read process.env.TELEMETRY_ENDPOINT (removed)', () => {
    const original = process.env.TELEMETRY_ENDPOINT;
    process.env.TELEMETRY_ENDPOINT = 'https://legacy.example.com/ingest';
    mockResolveAppUrl.mockReturnValue('https://app.example.com');
    try {
      expect(resolveTelemetryEndpoint()).toBe(
        'https://app.example.com/api/telemetry',
      );
    } finally {
      if (original !== undefined) {
        process.env.TELEMETRY_ENDPOINT = original;
      } else {
        delete process.env.TELEMETRY_ENDPOINT;
      }
    }
  });
});
