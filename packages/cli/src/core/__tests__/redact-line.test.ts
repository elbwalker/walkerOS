import { scrubSecrets, redactLine } from '../redact-line.js';

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
