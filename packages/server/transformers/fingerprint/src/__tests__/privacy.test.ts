import type { Transformer, WalkerOS } from '@walkeros/core';
import {
  createIngest,
  createMockContext,
  createMockLogger,
  getByPath,
} from '@walkeros/core';
import { transformerFingerprint } from '../transformer';
import type { FingerprintSettings } from '../types';

type FpTypes = Transformer.Types<FingerprintSettings>;
type Fingerprint = Awaited<ReturnType<typeof transformerFingerprint>>;

const chrome124 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.60 Safari/537.36';
const chrome124Patch =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.91 Safari/537.36';
const chrome125 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.60 Safari/537.36';
const firefox125 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';

const salt = 'test-salt';
const visitor = { ip: '203.0.113.7', userAgent: chrome124 };
const page = (
  url = 'https://www.example.gov/news?utm_source=x',
): WalkerOS.DeepPartialEvent => ({
  name: 'page view',
  source: { type: 'web', url },
});
const noUrl: WalkerOS.DeepPartialEvent = { name: 'page view' };

describe('Privacy defaults', () => {
  let logger = createMockLogger();

  beforeEach(() => {
    logger = createMockLogger();
    jest.useFakeTimers({ now: new Date('2026-09-21T12:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const init = (settings: FingerprintSettings) =>
    transformerFingerprint(
      createMockContext<FpTypes>({ config: { settings }, logger, id: 'fp' }),
    );

  const push = (
    transformer: Fingerprint,
    ingest: Record<string, unknown> = visitor,
    event: WalkerOS.DeepPartialEvent = page(),
  ) =>
    transformer.push(
      event,
      createMockContext<FpTypes>({
        logger,
        id: 'fp',
        ingest: { ...createIngest('test'), ...ingest },
      }),
    );

  const hash = async (
    transformer: Fingerprint,
    ingest?: Record<string, unknown>,
    event?: WalkerOS.DeepPartialEvent,
  ) => getByPath(await push(transformer, ingest, event), 'event.user.hash');

  it('hashes with only a salt configured', async () => {
    const transformer = await init({ salt });

    expect(await hash(transformer)).toMatch(/^[a-f0-9]{64}$/);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    ['two IPv4 in one /24 collapse', '203.0.113.7', '203.0.113.200', true],
    ['two IPv4 /24s differ', '203.0.113.7', '203.0.114.7', false],
    [
      'two IPv6 in one /48 collapse',
      '2001:db8:abcd:1::1',
      '2001:db8:abcd:2::2',
      true,
    ],
    ['two IPv6 /48s differ', '2001:db8:abcd::1', '2001:db8:abce::1', false],
    [
      'IPv4-mapped equals plain IPv4',
      '::ffff:203.0.113.7',
      '203.0.113.7',
      true,
    ],
  ])('ip: %s', async (_, a, b, same) => {
    const transformer = await init({ salt });

    const hashA = await hash(transformer, { ...visitor, ip: a });
    const hashB = await hash(transformer, { ...visitor, ip: b });

    expect(hashA === hashB).toBe(same);
  });

  it.each([
    ['same browser, major version and OS collapse', chrome124Patch, true],
    ['another major version differs', chrome125, false],
    ['another browser differs', firefox125, false],
  ])('userAgent: %s', async (_, userAgent, same) => {
    const transformer = await init({ salt });

    const hashA = await hash(transformer);
    const hashB = await hash(transformer, { ...visitor, userAgent });

    expect(hashA === hashB).toBe(same);
  });

  it.each([
    ['same host on two pages collapses', 'https://www.example.gov/a?x=1', true],
    ['another host differs', 'https://www.other.gov/news?utm_source=x', false],
  ])('site: %s', async (_, url, same) => {
    const transformer = await init({ salt });

    const hashA = await hash(transformer);
    const hashB = await hash(transformer, visitor, page(url));

    expect(hashA === hashB).toBe(same);
  });

  it('a static site value separates identifiers', async () => {
    const siteA = await init({ salt, site: { value: 'site-a' } });
    const siteB = await init({ salt, site: { value: 'site-b' } });

    expect(await hash(siteA, visitor, noUrl)).not.toBe(
      await hash(siteB, visitor, noUrl),
    );
  });

  it('different salts give different hashes', async () => {
    const saltA = await init({ salt: 'a' });
    const saltB = await init({ salt: 'b' });

    expect(await hash(saltA)).not.toBe(await hash(saltB));
  });

  it.each([
    [
      'default rotation changes at UTC midnight',
      undefined,
      '2026-09-21T23:59:00Z',
      '2026-09-22T00:01:00Z',
      false,
    ],
    [
      'daily is stable within a UTC day',
      'daily',
      '2026-09-21T00:01:00Z',
      '2026-09-21T23:59:00Z',
      true,
    ],
    [
      'hourly changes at the hour',
      'hourly',
      '2026-09-21T10:59:00Z',
      '2026-09-21T11:01:00Z',
      false,
    ],
    [
      'none is stable across days',
      'none',
      '2026-09-21T12:00:00Z',
      '2026-10-21T12:00:00Z',
      true,
    ],
  ] as const)('rotate: %s', async (_, rotate, first, second, same) => {
    const transformer = await init({ salt, rotate });

    jest.setSystemTime(new Date(first));
    const hashA = await hash(transformer);
    jest.setSystemTime(new Date(second));
    const hashB = await hash(transformer);

    expect(hashA === hashB).toBe(same);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
  ])('warns once when the salt is %s and still hashes', async (_, value) => {
    const transformer = await init({ salt: value });

    await hash(transformer);
    const result = await hash(transformer);

    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('salt'));
  });

  it.each([
    ['ip', { userAgent: chrome124 }, page()],
    ['userAgent', { ip: '203.0.113.7' }, page()],
    ['site', visitor, noUrl],
  ])('warns once when %s resolves empty', async (input, ingest, event) => {
    const transformer = await init({ salt });

    await hash(transformer, ingest, event);
    await hash(transformer, ingest, event);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(input));
  });

  it('false switches a named input off', async () => {
    const transformer = await init({ salt, userAgent: false });

    expect(await hash(transformer)).toBe(
      await hash(transformer, { ...visitor, userAgent: firefox125 }),
    );
  });

  it('a fields config does not pick up the named inputs', async () => {
    const transformer = await init({ salt, fields: ['ingest.ip'] });

    expect(await hash(transformer)).toBe(
      await hash(
        transformer,
        { ...visitor, userAgent: firefox125 },
        page('https://www.other.gov/'),
      ),
    );
  });

  it('never writes the raw IP onto the event', async () => {
    const transformer = await init({ salt });

    const result = await push(transformer);

    expect(JSON.stringify(result)).not.toContain('203.0.113');
  });
});
