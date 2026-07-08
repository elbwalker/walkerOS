import { parseTraceparent } from '../parseTraceparent';

const TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const SPAN = '00f067aa0ba902b7';

describe('parseTraceparent', () => {
  describe('happy path', () => {
    it('parses a canonical version-00 traceparent', () => {
      expect(parseTraceparent(`00-${TRACE}-${SPAN}-01`)).toEqual({
        trace: TRACE,
        parentSpan: SPAN,
      });
    });

    it('accepts sampled flags (01) and unsampled flags (00)', () => {
      expect(parseTraceparent(`00-${TRACE}-${SPAN}-00`)).toEqual({
        trace: TRACE,
        parentSpan: SPAN,
      });
    });

    it('accepts any 2-hex version other than ff (forward compat)', () => {
      for (const version of ['01', 'ab', 'fe', '7f']) {
        expect(parseTraceparent(`${version}-${TRACE}-${SPAN}-01`)).toEqual({
          trace: TRACE,
          parentSpan: SPAN,
        });
      }
    });
  });

  describe('rejections (return undefined, never throw)', () => {
    it('rejects non-string input', () => {
      expect(parseTraceparent(undefined)).toBeUndefined();
      expect(parseTraceparent(null)).toBeUndefined();
      expect(parseTraceparent(123)).toBeUndefined();
      expect(parseTraceparent(true)).toBeUndefined();
      expect(
        parseTraceparent({ traceparent: `00-${TRACE}-${SPAN}-01` }),
      ).toBeUndefined();
      expect(parseTraceparent([`00-${TRACE}-${SPAN}-01`])).toBeUndefined();
    });

    it('rejects wrong segment count', () => {
      expect(parseTraceparent('')).toBeUndefined();
      expect(parseTraceparent(TRACE)).toBeUndefined();
      expect(parseTraceparent(`00-${TRACE}-${SPAN}`)).toBeUndefined();
      expect(parseTraceparent(`00-${TRACE}-${SPAN}-01-extra`)).toBeUndefined();
    });

    it('rejects a version segment that is not exactly 2 hex chars', () => {
      expect(parseTraceparent(`0-${TRACE}-${SPAN}-01`)).toBeUndefined();
      expect(parseTraceparent(`000-${TRACE}-${SPAN}-01`)).toBeUndefined();
      expect(parseTraceparent(`0g-${TRACE}-${SPAN}-01`)).toBeUndefined();
      expect(parseTraceparent(`00 -${TRACE}-${SPAN}-01`)).toBeUndefined();
    });

    it('rejects the reserved ff version', () => {
      expect(parseTraceparent(`ff-${TRACE}-${SPAN}-01`)).toBeUndefined();
    });

    it('rejects a trace that is not exactly 32 lowercase hex', () => {
      expect(
        parseTraceparent(`00-${TRACE.slice(1)}-${SPAN}-01`),
      ).toBeUndefined();
      expect(parseTraceparent(`00-${TRACE}f-${SPAN}-01`)).toBeUndefined();
      expect(
        parseTraceparent(`00-${TRACE.toUpperCase()}-${SPAN}-01`),
      ).toBeUndefined();
      expect(
        parseTraceparent(`00-${'z'.repeat(32)}-${SPAN}-01`),
      ).toBeUndefined();
    });

    it('rejects a span that is not exactly 16 lowercase hex', () => {
      expect(
        parseTraceparent(`00-${TRACE}-${SPAN.slice(1)}-01`),
      ).toBeUndefined();
      expect(parseTraceparent(`00-${TRACE}-${SPAN}f-01`)).toBeUndefined();
      expect(
        parseTraceparent(`00-${TRACE}-${SPAN.toUpperCase()}-01`),
      ).toBeUndefined();
    });

    it('rejects flags that are not exactly 2 hex chars', () => {
      expect(parseTraceparent(`00-${TRACE}-${SPAN}-1`)).toBeUndefined();
      expect(parseTraceparent(`00-${TRACE}-${SPAN}-011`)).toBeUndefined();
      expect(parseTraceparent(`00-${TRACE}-${SPAN}-0g`)).toBeUndefined();
    });

    it('rejects an all-zero trace', () => {
      expect(
        parseTraceparent(`00-${'0'.repeat(32)}-${SPAN}-01`),
      ).toBeUndefined();
    });

    it('rejects an all-zero span', () => {
      expect(
        parseTraceparent(`00-${TRACE}-${'0'.repeat(16)}-01`),
      ).toBeUndefined();
    });
  });
});
