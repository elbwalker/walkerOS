import { serializeWithCode } from '../bundler';

describe('serializeWithCode __WALKEROS_ENV marker', () => {
  it('emits process.env expression for marker-only string', () => {
    expect(serializeWithCode('__WALKEROS_ENV:API_KEY', 0)).toBe(
      'process.env["API_KEY"]',
    );
  });

  it('emits process.env with fallback for marker with default', () => {
    expect(serializeWithCode('__WALKEROS_ENV:HOST:localhost', 0)).toBe(
      'process.env["HOST"] ?? "localhost"',
    );
  });

  it('handles URL default value with embedded colons', () => {
    expect(
      serializeWithCode('__WALKEROS_ENV:REDIS_URL:redis://localhost:6379', 0),
    ).toBe('process.env["REDIS_URL"] ?? "redis://localhost:6379"');
  });

  it('emits template literal for mixed content', () => {
    expect(serializeWithCode('https://__WALKEROS_ENV:HOST/api', 0)).toBe(
      '`https://${process.env["HOST"]}/api`',
    );
  });

  it('handles multiple markers in one string', () => {
    // PROTO captures `//` as default (chars before next marker are part of default)
    expect(
      serializeWithCode('__WALKEROS_ENV:PROTO://__WALKEROS_ENV:HOST/path', 0),
    ).toBe('`${process.env["PROTO"] ?? "//"}${process.env["HOST"]}/path`');
  });

  it('handles marker embedded in longer string with default', () => {
    // Default extends to end of string (no next marker to stop at)
    expect(serializeWithCode('prefix-__WALKEROS_ENV:PORT:8080-suffix', 0)).toBe(
      '`prefix-${process.env["PORT"] ?? "8080-suffix"}`',
    );
  });

  it('escapes dollar signs in static parts of template literals', () => {
    expect(serializeWithCode('Price is $5 for __WALKEROS_ENV:ITEM', 0)).toBe(
      '`Price is \\$5 for ${process.env["ITEM"]}`',
    );
  });

  it('escapes backticks in static parts of template literals', () => {
    expect(serializeWithCode('say `hello` to __WALKEROS_ENV:NAME', 0)).toBe(
      '`say \\`hello\\` to ${process.env["NAME"]}`',
    );
  });

  it('does not consume next marker as default value', () => {
    // `-` before next marker is captured as part of A's default
    expect(
      serializeWithCode('__WALKEROS_ENV:A:fallback-__WALKEROS_ENV:B', 0),
    ).toBe('`${process.env["A"] ?? "fallback-"}${process.env["B"]}`');
  });

  it('still handles $code: prefix', () => {
    expect(serializeWithCode('$code:myFunction()', 0)).toBe('myFunction()');
  });

  it('still handles plain strings', () => {
    expect(serializeWithCode('hello', 0)).toBe('"hello"');
  });
});
