import { createWrapper } from '../wrapper';
import type { Wrapper } from '../types';

describe('Wrapper', () => {
  describe('passthrough behavior', () => {
    it('should return a function that behaves identically to the original', () => {
      const originalFn = jest.fn((a: number, b: number) => a + b);
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      const result = wrappedFn(2, 3);

      expect(result).toBe(5);
      expect(originalFn).toHaveBeenCalledWith(2, 3);
    });

    it('should preserve return values', () => {
      const originalFn = jest.fn(() => ({ foo: 'bar' }));
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      const result = wrappedFn();

      expect(result).toEqual({ foo: 'bar' });
    });

    it('should handle void return functions', () => {
      const originalFn = jest.fn();
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      const result = wrappedFn();

      expect(result).toBeUndefined();
      expect(originalFn).toHaveBeenCalled();
    });

    it('should handle non-function values by returning them as-is', () => {
      const wrap = createWrapper('test-type');
      const nonFunction = { notAFunction: true };
      const wrapped = wrap('testValue', nonFunction);

      expect(wrapped).toBe(nonFunction);
    });
  });

  describe('type preservation', () => {
    it('should preserve function signatures', () => {
      const originalFn = (a: string, b: number): boolean => a.length > b;
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      // This should compile without type errors
      const result: boolean = wrappedFn('hello', 3);
      expect(result).toBe(true);
    });

    it('should preserve object types', () => {
      const wrap = createWrapper('test-type');
      const obj = { name: 'test', value: 42 };
      const wrapped = wrap('testObject', obj);

      expect(wrapped.name).toBe('test');
      expect(wrapped.value).toBe(42);
    });
  });

  describe('onCall callback', () => {
    it('should call onCall with correct context and arguments', () => {
      const onCall = jest.fn();
      const originalFn = jest.fn();
      const wrap = createWrapper('test-type', { onCall });
      const wrappedFn = wrap('testFunction', originalFn);

      wrappedFn('arg1', 'arg2');

      expect(onCall).toHaveBeenCalledWith(
        { name: 'testFunction', type: 'test-type' },
        ['arg1', 'arg2'],
      );
    });

    it('should not call onCall when not provided', () => {
      const originalFn = jest.fn();
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      expect(() => wrappedFn()).not.toThrow();
      expect(originalFn).toHaveBeenCalled();
    });

    it('should call onCall before executing the original function', () => {
      const callOrder: string[] = [];
      const onCall = jest.fn(() => callOrder.push('onCall'));
      const originalFn = jest.fn(() => callOrder.push('originalFn'));
      const wrap = createWrapper('test-type', { onCall });
      const wrappedFn = wrap('testFunction', originalFn);

      wrappedFn();

      expect(callOrder).toEqual(['onCall', 'originalFn']);
    });
  });

  describe('dry run mode', () => {
    it('should not execute original function in dry run mode', () => {
      const originalFn = jest.fn();
      const wrap = createWrapper('test-type', { dryRun: true });
      const wrappedFn = wrap('testFunction', originalFn);

      wrappedFn('arg1', 'arg2');

      expect(originalFn).not.toHaveBeenCalled();
    });

    it('should return mockReturn value in dry run mode', () => {
      const originalFn = jest.fn(() => 'original');
      const mockReturn = 'mocked';
      const wrap = createWrapper('test-type', { dryRun: true, mockReturn });
      const wrappedFn = wrap('testFunction', originalFn);

      const result = wrappedFn();

      expect(result).toBe('mocked');
      expect(originalFn).not.toHaveBeenCalled();
    });

    it('should return undefined when no mockReturn is provided', () => {
      const originalFn = jest.fn(() => 'original');
      const wrap = createWrapper('test-type', { dryRun: true });
      const wrappedFn = wrap('testFunction', originalFn);

      const result = wrappedFn();

      expect(result).toBeUndefined();
      expect(originalFn).not.toHaveBeenCalled();
    });

    it('should still call onCall in dry run mode', () => {
      const onCall = jest.fn();
      const originalFn = jest.fn();
      const wrap = createWrapper('test-type', { dryRun: true, onCall });
      const wrappedFn = wrap('testFunction', originalFn);

      wrappedFn('arg1');

      expect(onCall).toHaveBeenCalledWith(
        { name: 'testFunction', type: 'test-type' },
        ['arg1'],
      );
      expect(originalFn).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle functions with no arguments', () => {
      const originalFn = jest.fn(() => 'result');
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      const result = wrappedFn();

      expect(result).toBe('result');
      expect(originalFn).toHaveBeenCalledWith();
    });

    it('should handle functions with many arguments', () => {
      const originalFn = jest.fn((a, b, c, d, e) => [a, b, c, d, e]);
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      const result = wrappedFn(1, 2, 3, 4, 5);

      expect(result).toEqual([1, 2, 3, 4, 5]);
      expect(originalFn).toHaveBeenCalledWith(1, 2, 3, 4, 5);
    });

    it('should handle async functions', async () => {
      const originalFn = jest.fn(async (value: string) => `async-${value}`);
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      const result = await wrappedFn('test');

      expect(result).toBe('async-test');
      expect(originalFn).toHaveBeenCalledWith('test');
    });

    it('should handle functions that throw errors', () => {
      const originalFn = jest.fn(() => {
        throw new Error('test error');
      });
      const wrap = createWrapper('test-type');
      const wrappedFn = wrap('testFunction', originalFn);

      expect(() => wrappedFn()).toThrow('test error');
      expect(originalFn).toHaveBeenCalled();
    });

    it('should handle null and undefined values', () => {
      const wrap = createWrapper('test-type');

      expect(wrap('testNull', null)).toBe(null);
      expect(wrap('testUndefined', undefined)).toBe(undefined);
    });
  });

  describe('multiple wrapper instances', () => {
    it('should create independent wrapper instances', () => {
      const onCall1 = jest.fn();
      const onCall2 = jest.fn();
      const wrap1 = createWrapper('type1', { onCall: onCall1 });
      const wrap2 = createWrapper('type2', { onCall: onCall2 });

      const originalFn = jest.fn();
      const wrappedFn1 = wrap1('func1', originalFn);
      const wrappedFn2 = wrap2('func2', originalFn);

      wrappedFn1('arg1');
      wrappedFn2('arg2');

      expect(onCall1).toHaveBeenCalledWith({ name: 'func1', type: 'type1' }, [
        'arg1',
      ]);
      expect(onCall2).toHaveBeenCalledWith({ name: 'func2', type: 'type2' }, [
        'arg2',
      ]);
    });
  });
});
