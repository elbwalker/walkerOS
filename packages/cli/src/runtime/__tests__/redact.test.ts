import { redactLine, redactErrors, redactLogs } from '../redact.js';
import type { DedupedError, RingEntry } from '../log-ring.js';

describe('redactLine', () => {
  // Case 1: High-entropy token (32+ char base64/hex run)
  it('masks high-entropy token standalone', () => {
    const token = 'AKIAIOSFODNN7EXAMPLEKEY1234ABCD';
    expect(redactLine(`token is ${token} here`)).toBe('token is *** here');
  });

  it('masks 32-char hex token', () => {
    const hex = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    expect(redactLine(`key=${hex}`)).toBe('key=***');
  });

  // Case 2: URL credentials
  it('masks password in URL credentials', () => {
    const result = redactLine('postgres://user:p4ssw0rdSecret@host/db');
    expect(result).toBe('postgres://user:***@host/db');
  });

  it('keeps host visible after URL credential masking', () => {
    const result = redactLine(
      'connecting to postgres://admin:s3cr3tP4ss@db.example.com/mydb',
    );
    expect(result).toContain('db.example.com');
    expect(result).not.toContain('s3cr3tP4ss');
  });

  // Case 3: Authorization Bearer token
  it('masks Bearer token in Authorization header', () => {
    const longToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
    const result = redactLine(`Authorization: Bearer ${longToken}`);
    expect(result).not.toContain(longToken);
    expect(result).toContain('***');
  });

  // Case 4: KEY=value secret
  it('masks WALKEROS_INGEST_TOKEN value but keeps key name', () => {
    const result = redactLine(
      'WALKEROS_INGEST_TOKEN=sk_live_abc123def456ghi789',
    );
    expect(result).toBe('WALKEROS_INGEST_TOKEN=***');
  });

  it('masks KEY: value style secret', () => {
    const result = redactLine('SOME_SECRET_KEY: sk_live_abc123def456ghi789012');
    expect(result).toContain('SOME_SECRET_KEY');
    expect(result).not.toContain('sk_live_abc123def456ghi789012');
    expect(result).toContain('***');
  });

  // Case 5: Multi-line PEM block
  it('removes entire PEM private key block — no body lines survive', () => {
    const pem = [
      '-----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
      'o2FlZXZlciBiZSBhYmxlIHRvIHJlYWQgdGhpcyBkYXRhLg==',
      '-----END PRIVATE KEY-----',
    ].join('\n');
    const result = redactLine(`some prefix\n${pem}\nsome suffix`);
    expect(result).not.toContain('BEGIN PRIVATE KEY');
    expect(result).not.toContain('END PRIVATE KEY');
    expect(result).not.toContain(
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
    );
    expect(result).not.toContain(
      'o2FlZXZlciBiZSBhYmxlIHRvIHJlYWQgdGhpcyBkYXRhLg==',
    );
    expect(result).toContain('some prefix');
    expect(result).toContain('some suffix');
  });

  it('removes PEM block with no END marker — drops to end of entry', () => {
    const input = [
      'before',
      '-----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC',
    ].join('\n');
    const result = redactLine(input);
    expect(result).toContain('before');
    expect(result).not.toContain('BEGIN PRIVATE KEY');
    expect(result).not.toContain('MIIEvQIBADANBgkqhkiG9w0BAQEFAASC');
  });

  // Case 6: JSON service-account private_key field
  it('masks private_key value in JSON service-account fragment', () => {
    const json =
      '{"type":"service_account","client_email":"x@y.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBg==\\n-----END PRIVATE KEY-----\\n"}';
    const result = redactLine(json);
    expect(result).not.toContain('MIIEvQIBADANBg==');
    // The field key name survives for legibility; its value is masked.
    expect(result).toContain('client_email');
  });

  // Case 6b: service-account identifier fields are masked.
  // client_email and private_key_id identify and pair with the leaked SA, so
  // they must not ship even though they are not the private key body itself.
  it('masks client_email value in a service-account JSON fragment', () => {
    const json =
      '{"type":"service_account","client_email":"svc@my-proj.iam.gserviceaccount.com","token_uri":"https://oauth2.googleapis.com/token"}';
    const result = redactLine(json);
    expect(result).not.toContain('svc@my-proj.iam.gserviceaccount.com');
    expect(result).toContain('client_email');
    expect(result).toContain('***');
    // Non-secret structural fields are untouched.
    expect(result).toContain('service_account');
  });

  it('masks private_key_id value in a service-account JSON fragment', () => {
    const json =
      '{"private_key_id":"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0","type":"service_account"}';
    const result = redactLine(json);
    expect(result).not.toContain('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0');
    expect(result).toContain('private_key_id');
    expect(result).toContain('***');
  });

  // Case 6c: a full SA JSON blob embedded in an error message ships nothing
  // sensitive: no private key body, no email, no key id, no cert url.
  it('strips a full service-account JSON blob from an error message', () => {
    const sa =
      '{"type":"service_account","project_id":"my-proj","private_key_id":"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",' +
      '"private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw==\\n-----END PRIVATE KEY-----\\n",' +
      '"client_email":"svc@my-proj.iam.gserviceaccount.com",' +
      '"client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/svc%40my-proj.iam.gserviceaccount.com"}';
    const result = redactLine(`BigQuery init failed: ${sa}`);
    expect(result).not.toContain('MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw==');
    expect(result).not.toContain('svc@my-proj.iam.gserviceaccount.com');
    expect(result).not.toContain('svc%40my-proj.iam.gserviceaccount.com');
    expect(result).not.toContain('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0');
    expect(result).toContain('***');
    // Still informative: the operator sees what failed and the project.
    expect(result).toContain('BigQuery init failed');
    expect(result).toContain('my-proj');
  });

  // Case 6d: cert url and client_id are named explicitly, not left to heuristics.
  it('masks client_x509_cert_url and client_id JSON values explicitly', () => {
    const json =
      '{"client_id":"123456789012345678901","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/svc%40my-proj.iam.gserviceaccount.com"}';
    const result = redactLine(json);
    expect(result).not.toContain('123456789012345678901');
    expect(result).not.toContain('www.googleapis.com/robot/v1/metadata/x509');
    expect(result).not.toContain('svc%40my-proj.iam.gserviceaccount.com');
    expect(result).toContain('***');
  });

  // Case 7: Normal diagnostic line passes through
  it('passes normal diagnostic messages through unmodified', () => {
    const msg = 'Error: BigQuery 403 PERMISSION_DENIED on dataset analytics';
    expect(redactLine(msg)).toBe(msg);
  });

  it('does not over-redact short values or common words', () => {
    expect(redactLine('status: ok')).toBe('status: ok');
    expect(redactLine('count=42')).toBe('count=42');
    expect(redactLine('user=alice')).toBe('user=alice');
  });

  // Case 8: Long message truncated to a total of at most 256 chars (wire contract)
  it('truncates messages longer than 256 chars to total length <= 256', () => {
    // 'Z' is not a hex char and all-same-char entropy is 0, so this run passes
    // through unmasked and exercises the truncation path.
    const long = 'Z'.repeat(300);
    const result = redactLine(long);
    // The app's heartbeat schema enforces message .max(256). The ellipsis must
    // fit WITHIN the 256 budget, so total length is exactly 256 here, never 257.
    expect(result.length).toBeLessThanOrEqual(256);
    expect(result.length).toBe(256);
    expect(result.endsWith('…')).toBe(true);
    expect(result.startsWith('ZZZ')).toBe(true);
  });

  // Case 9: Secret straddling the 256-char boundary is masked not partially shown
  it('masks a secret straddling the 256-char boundary (masking before truncation)', () => {
    // Place a high-entropy token starting at position 240 (straddles char 256)
    const prefix = 'B'.repeat(240);
    const token = 'sk_live_abc123def456ghi789jkl0123456'; // 35 chars, starts at 240, ends at 275
    const input = prefix + token;
    expect(input.length).toBeGreaterThan(256);
    const result = redactLine(input);
    // The token must not appear partially in the output
    expect(result).not.toContain('sk_live_abc123def456ghi789');
    expect(result).not.toContain('sk_live');
    expect(result).toContain('***');
  });

  // Case 10: Adversarial large input completes without hanging
  it('handles ~10KB adversarial input without catastrophic backtracking', () => {
    // Token is at the end of the large input; after truncation it won't appear in the
    // 256-char window. The key assertion is no catastrophic backtracking (time bound)
    // and that the raw token value is not visible in the output. 'Z' is non-hex and
    // low-entropy so the padding survives unmasked and the result stays truncated.
    const bigLine =
      'Z'.repeat(10000) + 'sk_live_abc123def456ghi789jkl012345678';
    const start = Date.now();
    const result = redactLine(bigLine);
    const elapsed = Date.now() - start;
    // Should complete well under 1 second — proves no ReDoS
    expect(elapsed).toBeLessThan(1000);
    // The token value must not appear verbatim (it's either masked or truncated away)
    expect(result).not.toContain('sk_live_abc123def456ghi789jkl012345678');
    // Result is truncated
    expect(result.endsWith('…')).toBe(true);
  });

  // ── Security-review regressions ──────────────────────────────────────────

  // Leak A: lowercase / indented PEM block leaked its body (case-sensitive bug)
  it('removes a lowercase PEM block (case-insensitive)', () => {
    const pem = [
      '-----begin private key-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
      '-----end private key-----',
    ].join('\n');
    const result = redactLine(`prefix\n${pem}\nsuffix`);
    expect(result).not.toContain('begin private key');
    expect(result).not.toContain(
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
    );
    expect(result).toContain('prefix');
    expect(result).toContain('suffix');
  });

  it('removes an indented PEM block (leading whitespace tolerated)', () => {
    const pem = [
      '    -----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
      '    -----END PRIVATE KEY-----',
    ].join('\n');
    const result = redactLine(pem);
    expect(result).not.toContain('PRIVATE KEY');
    expect(result).not.toContain(
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
    );
  });

  // Leak B: all-hex digest (no letters mixed with digits in the >=20 sense) leaked
  it('masks an all-hex digest', () => {
    const digest = 'deadbeefdeadbeefdeadbeefdeadbeef'; // 32 hex chars
    const result = redactLine(`checksum ${digest} computed`);
    expect(result).not.toContain(digest);
    expect(result).toContain('***');
  });

  // Leak C: all-digit run leaked
  it('masks an all-digit token run', () => {
    const digits = '12345678901234567890123'; // 23 digits
    const result = redactLine(`id=${digits}`);
    expect(result).not.toContain(digits);
    expect(result).toContain('***');
  });

  // Leak D: all-letter base64url token (random, high entropy) leaked
  it('masks an all-letter high-entropy token', () => {
    const token = 'AbCdEfGhIjKlMnOpQrStUvWxYz'; // 26 distinct-ish letters, entropy >= 4.0
    const result = redactLine(`token ${token} ok`);
    expect(result).not.toContain(token);
    expect(result).toContain('***');
  });

  // Leak E: Bearer <letter-only-token> leaked (no digit gate caught it)
  it('masks a letter-only Bearer token', () => {
    const token = 'AbCdEfGhIjKlMnOpQrStUvWxYzaBcDeFgHiJ'; // random-looking letters
    const result = redactLine(`Authorization: Bearer ${token}`);
    expect(result).not.toContain(token);
    expect(result).toContain('***');
  });

  // Leak F: Slack hyphenated token leaked because '-' terminated the run
  it('masks a hyphenated Slack token (xoxb-...)', () => {
    const token = 'xoxb-2384-2384-AbCdEfGhIjKlMnOp';
    const result = redactLine(`SLACK_TOKEN: ${token}`);
    expect(result).not.toContain(token);
    expect(result).not.toContain('AbCdEfGhIjKlMnOp');
    expect(result).toContain('***');
  });

  it('masks a standalone hyphenated Slack token without a key prefix', () => {
    const token = 'xoxp-2384-2384-AbCdEfGhIjKlMnOp';
    const result = redactLine(`logged token ${token} here`);
    expect(result).not.toContain('xoxp-2384');
    expect(result).not.toContain('AbCdEfGhIjKlMnOp');
    expect(result).toContain('***');
  });

  // Force-mask prefixes are masked regardless of length/entropy
  it.each([
    ['sk-shorttoken123', 'sk-'],
    ['pk_shorttoken123', 'pk_'],
    ['ghp_16charsToken00', 'ghp_'],
    ['gho_16charsToken00', 'gho_'],
    ['AKIAIOSFODNN7EXAMPLE', 'AKIA'],
  ])('force-masks known-prefix token %s', (token) => {
    const result = redactLine(`value is ${token} end`);
    expect(result).not.toContain(token);
    expect(result).toContain('***');
  });

  // Leak G: JWT only partially masked — middle claims segment survived
  it('masks the FULL JWT (no surviving eyJ segment)', () => {
    const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const payload = 'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ';
    const signature = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const jwt = `${header}.${payload}.${signature}`;
    const result = redactLine(`Authorization: Bearer ${jwt}`);
    // No base64url segment of the JWT may survive — the whole thing is one run
    expect(result).not.toContain('eyJ');
    expect(result).not.toContain(header);
    expect(result).not.toContain(payload);
    expect(result).not.toContain(signature);
    expect(result).toContain('***');
  });

  // ReDoS: large no-space line must stay linear (the 10KB test is too small).
  // The bound is deliberately loose (2s): the fixed regex runs in single-digit
  // ms while the prior O(n^2) backtracking took seconds at this size, so 2s
  // cleanly separates linear from quadratic without flaking on slow/contended CI.
  it('handles a 60KB no-space line without quadratic backtracking', () => {
    // Key-prefixed value with no spaces, 60KB — the prior unbounded key prefix
    // backtracked O(n^2) on input like this.
    const big = 'KEY=' + 'a'.repeat(60_000);
    const start = Date.now();
    const result = redactLine(big);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
    expect(typeof result).toBe('string');
  });

  it('handles an 80KB key-shaped no-space line without quadratic backtracking', () => {
    // No '=' / ':' at all — exercises the key-prefix scan alone at scale.
    const big = 'a'.repeat(80_000);
    const start = Date.now();
    const result = redactLine(big);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
    expect(typeof result).toBe('string');
  });
});

describe('redactErrors', () => {
  it('masks secrets in error messages and converts timestamps to ISO strings', () => {
    const errors: DedupedError[] = [
      {
        message: 'token AKIAIOSFODNN7EXAMPLEKEY123456 leaked',
        count: 3,
        firstSeen: 1700000000000,
        lastSeen: 1700000060000,
      },
      {
        message: 'BigQuery 403 PERMISSION_DENIED',
        count: 1,
        firstSeen: 1700000010000,
        lastSeen: 1700000010000,
      },
    ];

    const result = redactErrors(errors);

    expect(result).toHaveLength(2);

    // First entry: secret masked, timestamps as ISO
    expect(result[0].message).not.toContain('AKIAIOSFODNN7EXAMPLEKEY123456');
    expect(result[0].message).toContain('***');
    expect(result[0].count).toBe(3);
    expect(result[0].firstSeen).toBe(new Date(1700000000000).toISOString());
    expect(result[0].lastSeen).toBe(new Date(1700000060000).toISOString());

    // Second entry: normal message passes through
    expect(result[1].message).toBe('BigQuery 403 PERMISSION_DENIED');
    expect(result[1].firstSeen).toBe(new Date(1700000010000).toISOString());
    expect(result[1].lastSeen).toBe(new Date(1700000010000).toISOString());
  });
});

describe('redactLogs', () => {
  it('masks secrets in log entries and converts timestamps to ISO strings', () => {
    const entries: RingEntry[] = [
      {
        time: 1700000000000,
        level: 'info',
        message: 'Connected to postgres://admin:s3cr3tP4ss@db.example.com/mydb',
      },
      {
        time: 1700000030000,
        level: 'error',
        message: 'Service started successfully',
      },
    ];

    const result = redactLogs(entries);

    expect(result).toHaveLength(2);

    // First entry: password masked, host visible, time as ISO
    expect(result[0].message).not.toContain('s3cr3tP4ss');
    expect(result[0].message).toContain('db.example.com');
    expect(result[0].time).toBe(new Date(1700000000000).toISOString());
    expect(result[0].level).toBe('info');

    // Second entry: normal message, time as ISO
    expect(result[1].message).toBe('Service started successfully');
    expect(result[1].time).toBe(new Date(1700000030000).toISOString());
    expect(result[1].level).toBe('error');
  });
});
