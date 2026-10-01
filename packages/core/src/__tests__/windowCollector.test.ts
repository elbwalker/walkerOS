import {
  checkWindowCollector,
  RESERVED_WINDOW_GLOBALS,
} from '../windowCollector';

describe('checkWindowCollector', () => {
  test.each(['walkerOS', 'walkerCollector', '_w$1', '$'])(
    'accepts %s',
    (name) => {
      expect(checkWindowCollector(name)).toEqual({ ok: true, name });
    },
  );

  test.each(['walker-os', '1walker', '', 'a.b', "x'];alert(1);//"])(
    'refuses %p as no identifier',
    (name) => {
      const check = checkWindowCollector(name);
      expect(check.ok).toBe(false);
      if (!check.ok)
        expect(check.reason).toMatch(/not a JavaScript identifier/);
    },
  );

  test.each([...RESERVED_WINDOW_GLOBALS])(
    'refuses the reserved global %s',
    (name) => {
      const check = checkWindowCollector(name);
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.reason).toMatch(/reserved/);
    },
  );

  test('refuses a non-string', () => {
    expect(checkWindowCollector(42).ok).toBe(false);
  });
});
