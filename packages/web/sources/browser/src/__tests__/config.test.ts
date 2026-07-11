import { getConfig } from '../config';

describe('getConfig capture default', () => {
  test('defaults capture to true', () => {
    expect(getConfig().capture).toBe(true);
  });

  test('respects an explicit capture:false override', () => {
    expect(getConfig({ capture: false }).capture).toBe(false);
  });

  test('respects an explicit capture:true override', () => {
    expect(getConfig({ capture: true }).capture).toBe(true);
  });
});
