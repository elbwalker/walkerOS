import type { Logger } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';
import { hashEvent } from '../hash';

async function hashUserData(
  user_data: Record<string, unknown>,
  doNotHash?: string[],
  logger?: Logger.Instance,
) {
  const result = await hashEvent({ user_data }, doNotHash, logger);
  return result.user_data;
}

describe('hashEvent normalization', () => {
  // Input and expected hash exactly as published in
  // https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
  it.each([
    [
      'em',
      'John_Smith@gmail.com',
      '62a14e44f765419d10fea99367361a727c12365e2520f32218d505ed9aa0f62f',
    ],
    [
      'fn',
      'Mary',
      '6915771be1c5aa0c886870b6951b03d7eafc121fea0e80a5ea83beb7c449f4ec',
    ],
    [
      'fn',
      'Valéry',
      '08e1996b5dd49e62a4b4c010d44e4345592a863bb9f8e3976219bac29417149c',
    ],
  ])('%s matches Meta example %s', async (key, input, expected) => {
    expect(await hashUserData({ [key]: input })).toEqual({ [key]: expected });
  });

  it.each([
    [
      'em trims and lowercases',
      'em',
      ' John_Smith@gmail.com ',
      'john_smith@gmail.com',
    ],
    [
      'ph removes symbols and letters',
      'ph',
      '+1 (650) 555-1212',
      '16505551212',
    ],
    ['ph removes leading zeros', 'ph', '0049 170 1234567', '491701234567'],
    ['ph accepts numbers', 'ph', 491701234567, '491701234567'],
    ['fn trims and lowercases', 'fn', ' Mary ', 'mary'],
    ['fn removes punctuation', 'fn', 'Mary-Ann.', 'maryann'],
    ['ln removes punctuation', 'ln', " O'Brien ", 'obrien'],
    [
      'db removes punctuation from year-first dates',
      'db',
      '1997-02-16',
      '19970216',
    ],
    [
      'db keeps unrecognized formats trimmed',
      'db',
      ' 02/16/1997 ',
      '02/16/1997',
    ],
    ['ge uses the lowercase initial', 'ge', 'Female', 'f'],
    [
      'ct removes punctuation, symbols and spaces',
      'ct',
      'New York!',
      'newyork',
    ],
    ['ct keeps UTF-8 letters', 'ct', 'München', 'münchen'],
    ['st removes punctuation and spaces', 'st', ' N.Y. ', 'ny'],
    ['zp removes spaces and dashes', 'zp', 'M1 1AE', 'm11ae'],
    ['zp uses the first 5 digits of a U.S. ZIP+4', 'zp', '94035-1234', '94035'],
    [
      'zp uses the first 5 digits of an unseparated ZIP+4',
      'zp',
      '940351234',
      '94035',
    ],
    ['country trims and lowercases', 'country', ' US ', 'us'],
    ['external_id is hashed as is', 'external_id', 'Cust-42', 'Cust-42'],
  ])('%s', async (_, key, input, normalized) => {
    expect(await hashUserData({ [key]: input })).toEqual({
      [key]: await getHashServer(normalized),
    });
  });

  it('normalizes every value of an array', async () => {
    expect(
      await hashUserData({ em: [' A@Example.com', 'b@example.com '] }),
    ).toEqual({
      em: [
        await getHashServer('a@example.com'),
        await getHashServer('b@example.com'),
      ],
    });
  });

  it('leaves doNotHash values untouched', async () => {
    const hashed =
      '62A14E44F765419D10FEA99367361A727C12365E2520F32218D505ED9AA0F62F';
    expect(await hashUserData({ ph: hashed }, ['ph'])).toEqual({ ph: hashed });
  });

  it('leaves keys that are not hashed untouched', async () => {
    expect(
      await hashUserData({ client_user_agent: ' Mozilla/5.0 ', fbc: 'fb.1.X' }),
    ).toEqual({ client_user_agent: ' Mozilla/5.0 ', fbc: 'fb.1.X' });
  });

  it('warns when db is not YYYYMMDD after normalization without logging it', async () => {
    const logger = createMockLogger();
    await hashUserData({ db: ['1997-02-16', ' 02/16/1997 '] }, [], logger);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('1997');
  });

  it('does not treat inherited object keys as hashed keys', async () => {
    expect(await hashUserData({ constructor: 'value' })).toEqual({
      constructor: 'value',
    });
  });
});
