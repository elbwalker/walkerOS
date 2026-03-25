import { createIngest, type Ingest } from '..';

describe('Ingest', () => {
  it('creates ingest with _meta initialized', () => {
    const ingest = createIngest('express');
    expect(ingest._meta.hops).toBe(0);
    expect(ingest._meta.path).toEqual(['express']);
  });

  it('is mutable — allows writing arbitrary keys', () => {
    const ingest = createIngest('express');
    ingest.botScore = 0.95;
    ingest.geo = { country: 'DE' };
    expect(ingest.botScore).toBe(0.95);
    expect(ingest.geo).toEqual({ country: 'DE' });
  });

  it('tracks hops and path via _meta', () => {
    const ingest = createIngest('express');
    ingest._meta.hops++;
    ingest._meta.path.push('validate');
    ingest._meta.hops++;
    ingest._meta.path.push('enrich');
    expect(ingest._meta.hops).toBe(2);
    expect(ingest._meta.path).toEqual(['express', 'validate', 'enrich']);
  });
});
