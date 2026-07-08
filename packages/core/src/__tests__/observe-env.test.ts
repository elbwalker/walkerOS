import { OBSERVE_ENV_KEY, isEnvObserve, parseCallPath } from '../observeEnv';
import type { Destination } from '../types';

describe('observeEnv', () => {
  describe('OBSERVE_ENV_KEY', () => {
    it('is the literal "observe"', () => {
      expect(OBSERVE_ENV_KEY).toBe('observe');
    });
  });

  describe('isEnvObserve', () => {
    it('accepts a valid recorder', () => {
      const value: Destination.EnvObserve = {
        paths: ['window.gtag'],
        record: () => undefined,
      };
      expect(isEnvObserve(value)).toBe(true);
    });

    it('accepts an empty paths array', () => {
      expect(isEnvObserve({ paths: [], record: () => undefined })).toBe(true);
    });

    it('tolerates extra keys', () => {
      const value = {
        paths: ['a'],
        record: () => undefined,
        extra: true,
      };
      expect(isEnvObserve(value)).toBe(true);
    });

    it('rejects null', () => {
      expect(isEnvObserve(null)).toBe(false);
    });

    it('rejects a primitive', () => {
      expect(isEnvObserve('observe')).toBe(false);
      expect(isEnvObserve(42)).toBe(false);
      expect(isEnvObserve(true)).toBe(false);
      expect(isEnvObserve(undefined)).toBe(false);
    });

    it('rejects a missing paths', () => {
      expect(isEnvObserve({ record: () => undefined })).toBe(false);
    });

    it('rejects a missing record', () => {
      expect(isEnvObserve({ paths: ['a'] })).toBe(false);
    });

    it('rejects paths that is not an array', () => {
      expect(isEnvObserve({ paths: 'a', record: () => undefined })).toBe(false);
    });

    it('rejects paths with a non-string entry', () => {
      expect(isEnvObserve({ paths: ['a', 1], record: () => undefined })).toBe(
        false,
      );
    });

    it('rejects record that is not a function', () => {
      expect(isEnvObserve({ paths: ['a'], record: 'nope' })).toBe(false);
    });
  });

  describe('parseCallPath', () => {
    it('splits a plain dot-path', () => {
      expect(parseCallPath('a.b')).toEqual(['a', 'b']);
    });

    it('strips a leading call: prefix', () => {
      expect(parseCallPath('call:window.gtag')).toEqual(['window', 'gtag']);
    });

    it('returns a single segment for a no-prefix single path', () => {
      expect(parseCallPath('foo')).toEqual(['foo']);
    });

    it('keeps a single call: path after stripping', () => {
      expect(parseCallPath('call:a.b.c')).toEqual(['a', 'b', 'c']);
    });

    it('strips only the literal call: prefix, never any other word:', () => {
      // A `<word>:` that is not `call:` stays part of the path (wrapEnv parity).
      expect(parseCallPath('window:gtag')).toEqual(['window:gtag']);
      expect(parseCallPath('foo:bar.baz')).toEqual(['foo:bar', 'baz']);
    });

    it('strips only a single leading call: prefix', () => {
      expect(parseCallPath('call:call:x')).toEqual(['call:x']);
    });

    it('returns [] for an empty string', () => {
      expect(parseCallPath('')).toEqual([]);
    });

    it('returns [] for a lone call: prefix', () => {
      expect(parseCallPath('call:')).toEqual([]);
    });

    it('returns [] for dots-only paths', () => {
      expect(parseCallPath('..')).toEqual([]);
      expect(parseCallPath('.')).toEqual([]);
    });

    it('returns [] for a consecutive-dot segment', () => {
      expect(parseCallPath('a..b')).toEqual([]);
    });

    it('returns [] for a leading or trailing dot', () => {
      expect(parseCallPath('.a')).toEqual([]);
      expect(parseCallPath('a.')).toEqual([]);
    });
  });
});
