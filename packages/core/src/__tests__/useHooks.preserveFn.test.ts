/**
 * Type-level test that useHooks preserves the exact fn type. Compiles or
 * fails at typecheck. The runtime body is a no-op assertion just to keep
 * jest happy.
 */
import { useHooks } from '../useHooks';

interface NamedSignature {
  (event: { id: string }, options?: { tag?: string }): Promise<number>;
}

interface OverloadedSignature {
  (kind: 'a', value: number): Promise<string>;
  (kind: 'b', value: { tag: string }): Promise<string>;
}

describe('useHooks preserves the exact fn type', () => {
  test('accepts a named-signature fn and returns the same named signature', () => {
    const fn: NamedSignature = async (event, options) => {
      void options;
      return event.id.length;
    };
    const wrapped = useHooks(fn, 'Test', {});
    // The assignment-target slot is the exact same named interface. If
    // useHooks returns the tuple-spread form, this assignment errors.
    const slot: NamedSignature = wrapped;
    expect(typeof slot).toBe('function');
  });

  test('preserves arity for fns with required + optional parameters', () => {
    function fn(a: number, b?: string): string {
      return a + (b ?? '');
    }
    const wrapped = useHooks(fn, 'Arity', {});
    // This must compile without a cast.
    const same: (a: number, b?: string) => string = wrapped;
    expect(typeof same).toBe('function');
  });

  test('preserves overloaded call signatures', () => {
    const fn: OverloadedSignature = async (
      _kind: 'a' | 'b',
      _value: number | { tag: string },
    ) => 'ok';
    const wrapped = useHooks(fn, 'Overload', {});
    // Calling with each overload must compile without a cast. Under a
    // tuple-spread return type, only the final implementation signature
    // survives generic inference and the first overload form errors.
    const slot: OverloadedSignature = wrapped;
    expect(typeof slot).toBe('function');
  });
});
