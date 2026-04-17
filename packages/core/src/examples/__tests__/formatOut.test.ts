import type { StepOut } from '../../types/flow';
import { formatOut } from '../formatOut';

describe('formatOut', () => {
  it('returns "// no output" for empty out', () => {
    expect(formatOut([])).toBe('// no output');
  });

  it('formats a single call with primitive args', () => {
    expect(formatOut([['gtag', 'event', 'purchase']])).toBe(
      'gtag("event", "purchase")',
    );
  });

  it('formats an object arg with indented JSON', () => {
    expect(formatOut([['gtag', 'event', { transaction_id: 'o1' }]])).toBe(
      'gtag("event", {\n  "transaction_id": "o1"\n})',
    );
  });

  it('joins multiple calls with semicolon + blank line', () => {
    const out: StepOut = [
      ['gtag', 'event', 'login'],
      ['dataLayer.push', { event: 'login' }],
    ];
    expect(formatOut(out)).toBe(
      'gtag("event", "login");\n\ndataLayer.push({\n  "event": "login"\n})',
    );
  });

  it('renders return callable as keyword with value', () => {
    expect(formatOut([['return', { name: 'order complete' }]])).toBe(
      'return {\n  "name": "order complete"\n}',
    );
  });

  it('renders bare return with no args', () => {
    expect(formatOut([['return']])).toBe('return');
  });

  it('renders return false', () => {
    expect(formatOut([['return', false]])).toBe('return false');
  });

  it('renders undefined as literal token', () => {
    expect(formatOut([['gtag', undefined]])).toBe('gtag(undefined)');
  });

  it('renders null as literal token', () => {
    expect(formatOut([['gtag', null]])).toBe('gtag(null)');
  });

  it('renders nested objects with deep indent', () => {
    const out: StepOut = [
      [
        'gtag',
        'event',
        'purchase',
        {
          items: [{ id: 'p1', price: 19.99 }],
        },
      ],
    ];
    expect(formatOut(out)).toContain('"items": [');
    expect(formatOut(out)).toContain('"id": "p1"');
  });

  it('handles functions with placeholder', () => {
    const fn = () => 1;
    expect(formatOut([['gtag', fn]])).toBe('gtag([Function])');
  });
});
