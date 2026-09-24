import { generateKeyPairSync, sign } from 'crypto';
import { scrubSecrets, redactLine } from '../redactLine';

describe('scrubSecrets', () => {
  it('masks a high-entropy token', () => {
    const token = 'AKIAIOSFODNN7EXAMPLEKEY1234ABCD';
    expect(scrubSecrets(`token is ${token} here`)).toBe('token is *** here');
  });

  it('masks a JSON private_key value', () => {
    const json =
      '{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBg==\\n-----END PRIVATE KEY-----\\n"}';
    const result = scrubSecrets(json);
    expect(result).not.toContain('MIIEvQIBADANBg==');
  });

  it('masks a client_email value but keeps the key name', () => {
    const json =
      '{"client_email":"svc@my-proj.iam.gserviceaccount.com","type":"service_account"}';
    const result = scrubSecrets(json);
    expect(result).not.toContain('svc@my-proj.iam.gserviceaccount.com');
    expect(result).toContain('client_email');
  });

  it('masks a client_x509_cert_url value', () => {
    const json =
      '{"client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/svc%40my-proj.iam.gserviceaccount.com"}';
    const result = scrubSecrets(json);
    expect(result).not.toContain('svc%40my-proj.iam.gserviceaccount.com');
    expect(result).toContain('***');
  });

  it('removes a multi-line PEM private key block', () => {
    const pem = [
      '-----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
      '-----END PRIVATE KEY-----',
    ].join('\n');
    const result = scrubSecrets(`prefix\n${pem}\nsuffix`);
    expect(result).not.toContain('BEGIN PRIVATE KEY');
    expect(result).not.toContain(
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
    );
    expect(result).toContain('prefix');
    expect(result).toContain('suffix');
  });

  it('leaves a normal diagnostic line unchanged', () => {
    const msg = 'Error: BigQuery 403 PERMISSION_DENIED on dataset analytics';
    expect(scrubSecrets(msg)).toBe(msg);
  });

  it('does NOT truncate long non-secret messages (console legibility)', () => {
    const long = 'a normal long message '.repeat(50);
    // scrubSecrets must preserve the full message; only redactLine truncates.
    expect(scrubSecrets(long)).toBe(long);
    expect(scrubSecrets(long).length).toBeGreaterThan(256);
  });

  // ReDoS: a BEGIN marker with no END plus a large run must complete fast.
  it('handles a BEGIN-without-END PEM with a large run in under 1000ms', () => {
    const input = '-----BEGIN PRIVATE KEY-----\n' + 'A'.repeat(200_000);
    const start = Date.now();
    const result = scrubSecrets(input);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
    expect(typeof result).toBe('string');
    expect(result).not.toContain('BEGIN PRIVATE KEY');
  });

  // ── Path/URL legibility: `/` is structural, not a secret signal ───────────
  // These run on every console line now, so ordinary BigQuery/GCS diagnostics
  // (FQNs, gs:// paths, request paths, googleapis URLs) must survive UNMASKED.
  describe('does not over-redact paths and URLs', () => {
    it.each([
      'analytics.dataset.events_table',
      'gs://my-bucket/path/to/object.json',
      'GET /api/users/12345/settings 200',
      'https://bigquery.googleapis.com/v2/projects/p/datasets/d',
      'https://oauth2.googleapis.com/token',
      'call JSONWriter.appendRows',
      'PubSub.topic.publishMessage',
    ])('leaves %s unmasked', (line) => {
      const result = scrubSecrets(line);
      expect(result).toBe(line);
      expect(result).not.toContain('***');
    });
  });

  // ── Real secrets still masked (the path/URL relaxation must not leak) ──────
  describe('still masks real secrets', () => {
    it('masks a base64 token containing + / = padding', () => {
      const token = 'aGVsbG8gd29ybGQgdGhpcy9pcythL3Rlc3Q9'; // has / and =
      const result = scrubSecrets(`body ${token} end`);
      expect(result).not.toContain(token);
      expect(result).toContain('***');
    });

    it('masks a high-entropy token even when it contains a slash', () => {
      // 31-char + 8-char segments split on `/`; the first segment is itself a
      // high-entropy secret, so the whole run is masked.
      const token = 'kJ8sL2mNqRtVxYzAbCdEfGhIjKlMnOp/QrStUvWx';
      const result = scrubSecrets(`token ${token} ok`);
      expect(result).not.toContain('kJ8sL2mNqRtVxYzAbCdEfGhIjKlMnOp');
      expect(result).toContain('***');
    });

    it('masks a dotted token whose segments are secret-shaped', () => {
      const token =
        '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';
      const result = scrubSecrets(`key ${token} ok`);
      expect(result).not.toContain('aB3dE5fG7hJ9kL1mN3pQ5r');
      expect(result).not.toContain(
        'sT7uV9wX1yZ3aB5cD7eF9gH1jK3lM5nP7qR9sT1uV3w',
      );
    });

    it('masks an all-hex digest', () => {
      const digest = 'deadbeefdeadbeefdeadbeefdeadbeef';
      const result = scrubSecrets(`checksum ${digest}`);
      expect(result).not.toContain(digest);
      expect(result).toContain('***');
    });

    it('masks a known-prefix token', () => {
      const result = scrubSecrets('key is AKIAIOSFODNN7EXAMPLE done');
      expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(result).toContain('***');
    });
  });

  // ── PEM + all five SA-JSON fields unaffected by the path relaxation ────────
  describe('PEM and SA-JSON fields remain masked', () => {
    it('removes a PEM block', () => {
      const pem = [
        '-----BEGIN PRIVATE KEY-----',
        'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
        '-----END PRIVATE KEY-----',
      ].join('\n');
      const result = scrubSecrets(`x\n${pem}\ny`);
      expect(result).not.toContain('BEGIN PRIVATE KEY');
      expect(result).not.toContain(
        'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
      );
    });

    it.each([
      [
        'private_key',
        '-----BEGIN PRIVATE KEY-----\\nMIIEvQ==\\n-----END PRIVATE KEY-----\\n',
        'MIIEvQ==',
      ],
      [
        'client_email',
        'svc@my-proj.iam.gserviceaccount.com',
        'svc@my-proj.iam.gserviceaccount.com',
      ],
      [
        'private_key_id',
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      ],
      ['client_id', '123456789012345678901', '123456789012345678901'],
      [
        'client_x509_cert_url',
        'https://www.googleapis.com/robot/v1/metadata/x509/svc%40my-proj.iam.gserviceaccount.com',
        'svc%40my-proj.iam.gserviceaccount.com',
      ],
    ])('masks the %s SA-JSON field value', (_field, value, secret) => {
      const json = `{"${_field}":"${value}"}`;
      const result = scrubSecrets(`init failed ${json}`);
      // The secret value is gone and masking is visible. (Field-name legibility
      // is handled by the named-field replacement; a name that itself trips the
      // token heuristic, like client_x509_cert_url, is harmlessly masked too.)
      expect(result).not.toContain(secret);
      expect(result).toContain('***');
    });
  });
});

// Recorded simulate calls egress through scrubSecrets as serialized JSON, the
// same way a logger context does, so these are the shapes vendor calls carry.
describe('scrubSecrets on serialized vendor calls', () => {
  const metaToken =
    'EAABsbCS1iHgBAKZCZBqwZDZDq7xQ9kLmN3pRsT5vWyZ1aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';

  it('masks an access_token query parameter and keeps the URL host and path', () => {
    const url = `https://graph.facebook.com/v19.0/1/events?access_token=${metaToken}`;
    const result = scrubSecrets(JSON.stringify([url]));
    expect(result).not.toContain(metaToken);
    expect(result).toContain('https://graph.facebook.com/v19.0/1/events');
  });

  it('masks a JWT assertion signed with a private key', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const part = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const header = part({ alg: 'RS256', typ: 'JWT' });
    const claims = part({
      iss: 'svc@my-proj.iam.gserviceaccount.com',
      aud: 'https://oauth2.googleapis.com/token',
      exp: 1790000000,
    });
    const signature = sign(
      'RSA-SHA256',
      Buffer.from(`${header}.${claims}`),
      privateKey,
    ).toString('base64url');
    const body = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${claims}.${signature}`;
    const result = scrubSecrets(JSON.stringify([{ method: 'POST', body }]));
    expect(result).not.toContain(signature.slice(0, 20));
    expect(result).not.toContain(claims.slice(0, 20));
    expect(result).toContain('grant_type');
  });

  it.each([
    ['password', 'correcthorsebatterystaple'],
    ['client_secret', 'plainwordsecretvalue'],
    ['apiKey', 'lowercaseletterskey'],
    ['Authorization', 'Basic dXNlcjpwYXNzMTIzNA=='],
    ['authorization', 'Bearer abcdefghijklmnopqrstu'],
  ])('masks the value of a JSON %s field', (key, value) => {
    const json = JSON.stringify({ user: 'admin', [key]: value });
    const result = scrubSecrets(json);
    expect(result).not.toContain(value);
    expect(JSON.parse(result)).toEqual({ user: 'admin', [key]: '***' });
  });

  it('masks a secret field inside a JSON string body', () => {
    const body = JSON.stringify({ password: 'correcthorsebatterystaple' });
    const result = scrubSecrets(JSON.stringify([body]));
    expect(result).not.toContain('correcthorsebatterystaple');
    expect(JSON.parse(result)).toEqual(['{"password":"***"}']);
  });

  it.each([
    [
      'a dotted KEY=value secret',
      'DB_PASSWORD=Sup3rS3cret.Pass2024',
      'Sup3rS3cret',
    ],
    [
      'a dotted key: value secret',
      'api_key: abc123def456.ghi789jk',
      'abc123def456',
    ],
    [
      'a dotted run of secret-shaped segments',
      'token AbC123dEf456gh.GhI789jKl012mn.MnO345pQr678st end',
      'AbC123dEf456gh',
    ],
    [
      'a KEY=value path with a short-part dotted segment',
      'DB_PASSWORD=abc/Sup3rS3cret.Pass2024',
      'Sup3rS3cret',
    ],
    [
      'a short key with the same path',
      'pw=abc/Sup3rS3cret.Pass2024',
      'Sup3rS3cret',
    ],
    [
      'the same path as a bare run',
      'x abc/Sup3rS3cret.Pass2024 y',
      'Sup3rS3cret',
    ],
  ])('masks %s', (_label, line, secret) => {
    expect(scrubSecrets(line)).not.toContain(secret);
  });

  it('keeps a URL legible when an email follows in the same JSON line', () => {
    const json = JSON.stringify({
      url: 'http://localhost:8080/collect',
      email: 'jane@example.com',
    });
    expect(scrubSecrets(json)).toBe(json);
  });

  it('masks URL credentials inside JSON', () => {
    const json = JSON.stringify({ dsn: 'postgres://app:S3cretPass@db.io/x' });
    const result = scrubSecrets(json);
    expect(result).not.toContain('S3cretPass');
    expect(JSON.parse(result)).toEqual({ dsn: 'postgres://app:***@db.io/x' });
  });

  it.each([
    ['a value with an escaped quote', { password: 'ab"cd efgh ijkl' }, 'efgh'],
    ['a value with a backslash', { password: 'ab\\cd efgh ijkl' }, 'efgh'],
    ['a numeric value', { password: 12345678 }, '12345678'],
    [
      'an AWS secret access key',
      { secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
      'bPxRfiCYEXAMPLEKEY',
    ],
    ['a session token', { sessionToken: 'plainwordsession' }, 'plainword'],
  ])('masks a JSON credential field with %s', (_label, value, secret) => {
    const result = scrubSecrets(JSON.stringify(value));
    expect(result).not.toContain(secret);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it.each([
    ['an X-API-Key header', { 'X-API-Key': 'myKey-2024-prod' }, 'myKey'],
    ['an api_secret field', { api_secret: 'plainwordsecret' }, 'plainword'],
    ['an apiSecret field', { apiSecret: 'plainwordsecret' }, 'plainword'],
    ['an API-Key field', { 'API-Key': 'plainwordkey' }, 'plainword'],
  ])('masks %s', (_label, value, secret) => {
    const result = scrubSecrets(JSON.stringify(value));
    expect(result).not.toContain(secret);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it.each([
    [
      'an api_secret query parameter',
      'https://www.google-analytics.com/mp/collect?measurement_id=G-ABC&api_secret=plainwordsecret',
      'https://www.google-analytics.com/mp/collect?measurement_id=G-ABC&api_secret=***',
    ],
    [
      'an access_token query parameter',
      'GET /events?access_token=shortword&x=1',
      'GET /events?access_token=***&x=1',
    ],
    [
      'URL credentials with an empty user',
      'redis://:pw@cache:6379',
      'redis://:***@cache:6379',
    ],
  ])('masks %s', (_label, line, expected) => {
    expect(scrubSecrets(line)).toBe(expected);
  });

  it.each([
    'GET /search?tokenize=true&keyword=shoes',
    '{"monkey":"banana","tokenType":"Bearer"}',
    'http://localhost:8080/collect',
  ])('leaves %s legible', (line) => {
    expect(scrubSecrets(line)).toBe(line);
  });

  describe('private keys under any field', () => {
    const pem = [
      '-----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
      'abcdefghijklmnopqrstuvwxyzabcdefghij',
      '-----END PRIVATE KEY-----',
      '',
    ].join('\n');

    it.each([
      ['privateKey', { privateKey: pem }],
      ['key', { key: pem }],
      ['a serialized service account', [JSON.stringify({ private_key: pem })]],
      [
        'a serialized client email',
        [
          JSON.stringify({
            client_email: 'svc@my-proj.iam.gserviceaccount.com',
          }),
        ],
      ],
    ])('masks %s', (_label, value) => {
      const result = scrubSecrets(JSON.stringify(value));
      expect(result).not.toContain('MIIEvQIBADANBg');
      expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz');
      expect(result).not.toContain('svc@my-proj');
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  it('keeps JSON escapes intact when masking the run after them', () => {
    const pemBody =
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7kJ8sL2mNqRtVxYz';
    const json = JSON.stringify([`line one\n${pemBody}`, `x\n${pemBody}`]);
    const result = scrubSecrets(json);
    expect(result).not.toContain(pemBody);
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

describe('redactLine (truncating wire variant)', () => {
  it('still truncates to <= 256 chars for the heartbeat wire contract', () => {
    const long = 'Z'.repeat(300);
    const result = redactLine(long);
    expect(result.length).toBe(256);
    expect(result.endsWith('…')).toBe(true);
  });

  it('scrubs secrets as well', () => {
    const token = 'AKIAIOSFODNN7EXAMPLEKEY1234ABCD';
    expect(redactLine(`token is ${token} here`)).toBe('token is *** here');
  });
});
