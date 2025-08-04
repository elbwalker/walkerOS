import { walkerOSArgTypes } from '../types';

describe('walkerOS types', () => {
  test('walkerOSArgTypes should be defined', () => {
    expect(walkerOSArgTypes).toBeDefined();
    expect(typeof walkerOSArgTypes).toBe('object');
  });

  test('should have expected arg types', () => {
    expect(walkerOSArgTypes.elbEntity).toBeDefined();
    expect(walkerOSArgTypes.elbTrigger).toBeDefined();
    expect(walkerOSArgTypes.elbAction).toBeDefined();
    expect(walkerOSArgTypes.elbData).toBeDefined();
    expect(walkerOSArgTypes.elbContext).toBeDefined();
  });
});
