import { AwsDeliveryError } from '../errors';
import { parseCredentials } from '../credentials';

const SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYSECRETVALUE';
const KEY = 'AKIAIOSFODNN7EXAMPLE';

function messageOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AwsDeliveryError);
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('expected a throw');
}

describe('parseCredentials', () => {
  it('accepts the object form', () => {
    expect(
      parseCredentials({ accessKeyId: KEY, secretAccessKey: SECRET }),
    ).toEqual({ accessKeyId: KEY, secretAccessKey: SECRET });
  });

  it('accepts the JSON string form with a session token', () => {
    expect(
      parseCredentials(
        JSON.stringify({
          accessKeyId: KEY,
          secretAccessKey: SECRET,
          sessionToken: 'token',
        }),
      ),
    ).toEqual({
      accessKeyId: KEY,
      secretAccessKey: SECRET,
      sessionToken: 'token',
    });
  });

  it.each([undefined, null, ''])('treats %p as unset', (input) => {
    expect(parseCredentials(input)).toBeUndefined();
  });

  it('rejects invalid JSON without echoing it', () => {
    const message = messageOf(() =>
      parseCredentials(`{"accessKeyId":"${KEY}","secretAccessKey":"${SECRET}"`),
    );
    expect(message).toContain('not valid JSON');
    expect(message).not.toContain(KEY);
    expect(message).not.toContain(SECRET);
  });

  it.each([
    ['accessKeyId', { secretAccessKey: SECRET }],
    ['secretAccessKey', { accessKeyId: KEY }],
    ['secretAccessKey', { accessKeyId: KEY, secretAccessKey: '' }],
  ])('names a missing %s and no value', (field, input) => {
    const message = messageOf(() => parseCredentials(input));
    expect(message).toContain(`config.credentials.${field}`);
    expect(message).not.toContain(KEY);
    expect(message).not.toContain(SECRET);
  });

  it('rejects a non-object', () => {
    expect(messageOf(() => parseCredentials(42))).toContain(
      'must be an object',
    );
  });
});
