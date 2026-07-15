import {
  parseGrant,
  verifyActivation,
  CLOCK_SKEW_MS,
  MAX_SESSION_MS,
  type ActivationGrant,
  type PreviewKey,
  type VerifyParams,
} from '../preview';
import { webcrypto } from 'node:crypto';

const b64url = (s: string) => Buffer.from(s).toString('base64url');

// VerifyParams.crypto is a structural PreviewCrypto, so node's webcrypto
// passes without any cast (core tests run under jsdom, which has no subtle).
const crypto = webcrypto;

const b64urlBytes = (bytes: ArrayBuffer | Uint8Array) =>
  Buffer.from(
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
  ).toString('base64url');

function makeRaw(payload: Record<string, unknown>): string {
  const header = b64url(
    JSON.stringify({ alg: 'ES256', kid: 'pk_stage_abc12345' }),
  );
  const body = b64url(JSON.stringify(payload));
  const sig = Buffer.alloc(64, 1).toString('base64url');
  return `${header}.${body}.${sig}`;
}

describe('parseGrant', () => {
  const payload = {
    iss: 'app:stage',
    aud: ['https://shop.example.com'],
    iat: 1_700_000_000,
    sxp: 1_700_003_600,
    art: 'art_abc',
    sri: 'sha384-AAAA',
    pb: 'pb_xyz',
    cap: 'activate',
    jti: 'gr_1',
    pid: 'prv_1',
  };

  it('parses a well-formed grant into claims, signed bytes and signature', () => {
    const parsed = parseGrant(makeRaw(payload));
    expect(parsed).not.toBeNull();
    expect(parsed?.grant.art).toBe('art_abc');
    expect(parsed?.grant.aud).toEqual(['https://shop.example.com']);
    expect(parsed?.kid).toBe('pk_stage_abc12345');
    expect(parsed?.signature.byteLength).toBe(64);
  });

  const validHeader = b64url(
    JSON.stringify({ alg: 'ES256', kid: 'pk_stage_abc12345' }),
  );
  const validSig = Buffer.alloc(64, 1).toString('base64url');

  it.each([
    ['empty', ''],
    ['not three segments', 'a.b'],
    [
      // Standard (non-url) base64 of a fully valid payload: it decodes fine
      // via atob but its '=' padding is outside the base64url charset, so
      // this exercises the character-set check on the payload segment only.
      'non-base64url payload',
      `${validHeader}.${Buffer.from(JSON.stringify(payload)).toString('base64')}.${validSig}`,
    ],
    [
      'payload missing required claims',
      `${validHeader}.${b64url(JSON.stringify({ iss: 'app:stage' }))}.${validSig}`,
    ],
    [
      'wrong signature length',
      `${b64url(JSON.stringify({ alg: 'ES256', kid: 'k' }))}.${b64url(JSON.stringify(payload))}.${Buffer.alloc(10).toString('base64url')}`,
    ],
  ])('returns null for %s', (_label, raw) => {
    expect(parseGrant(raw)).toBeNull();
  });
});

describe('verifyActivation', () => {
  const NOW = 1_700_000_000_000; // ms
  let publicSpki: string;
  let privateKey: webcrypto.CryptoKey;

  const base: ActivationGrant = {
    iss: 'app:stage',
    aud: ['https://shop.example.com'],
    iat: NOW / 1000,
    sxp: NOW / 1000 + 3600,
    art: 'art_abc',
    sri: 'sha384-AAAA',
    pb: 'pb_project_a',
    cap: 'activate',
    jti: 'gr_1',
    pid: 'prv_1',
  };

  async function sign(
    grant: ActivationGrant,
    kid = 'pk_stage_abc12345',
  ): Promise<string> {
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid })).toString(
      'base64url',
    );
    const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
    const signed = Buffer.from(`${header}.${payload}`); // no TextEncoder under jsdom
    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      signed,
    );
    return `${header}.${payload}.${b64urlBytes(sig)}`;
  }

  type WebVerifyParams = Extract<VerifyParams, { origin: string }>;
  type ContainerVerifyParams = Extract<
    VerifyParams,
    { expectSession: { ses: string; sb: string } }
  >;

  function params(overrides: Partial<WebVerifyParams> = {}): VerifyParams {
    return {
      keyring: [{ kid: 'pk_stage_abc12345', spki: publicSpki }],
      iss: 'app:stage',
      origin: 'https://shop.example.com',
      pb: 'pb_project_a',
      source: 'url',
      now: NOW,
      crypto,
      ...overrides,
    };
  }

  // Container mode: no origin, session-bound instead. Mirrors the real
  // caller (the runner's health-server gate), which has no page origin and
  // verifies by `ses`/`sb` alone.
  function containerParams(
    overrides: Partial<ContainerVerifyParams> = {},
  ): VerifyParams {
    return {
      keyring: [{ kid: 'pk_stage_abc12345', spki: publicSpki }],
      iss: 'app:stage',
      pb: 'pb_project_a',
      source: 'url',
      now: NOW,
      crypto,
      expectSession: { ses: 'ses_1', sb: 'sb_one' },
      ...overrides,
    };
  }

  beforeAll(async () => {
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    privateKey = pair.privateKey;
    publicSpki = b64urlBytes(
      await crypto.subtle.exportKey('spki', pair.publicKey),
    );
  });

  it('accepts a valid grant from the URL', async () => {
    const result = await verifyActivation(await sign(base), params());
    expect(result).toEqual({ ok: true, grant: base });
  });

  it('rejects a grant whose signature was made by a different key', async () => {
    const other = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const otherSpki = b64urlBytes(
      await crypto.subtle.exportKey('spki', other.publicKey),
    );
    const result = await verifyActivation(
      await sign(base),
      params({ keyring: [{ kid: 'pk_stage_abc12345', spki: otherSpki }] }),
    );
    expect(result).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('rejects an unknown kid', async () => {
    const result = await verifyActivation(
      await sign(base, 'pk_stage_rotated'),
      params(),
    );
    expect(result).toEqual({ ok: false, reason: 'kid-mismatch' });
  });

  it('selects the matching key from a multi-key keyring', async () => {
    const stale = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const staleSpki = b64urlBytes(
      await crypto.subtle.exportKey('spki', stale.publicKey),
    );
    const result = await verifyActivation(
      await sign(base),
      params({
        keyring: [
          { kid: 'pk_stage_old', spki: staleSpki },
          { kid: 'pk_stage_abc12345', spki: publicSpki },
        ],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a foreign issuer', async () => {
    const result = await verifyActivation(
      await sign({ ...base, iss: 'app:prod' }),
      params(),
    );
    expect(result).toEqual({ ok: false, reason: 'foreign-issuer' });
  });

  it('rejects a URL grant older than the 15 minute window', async () => {
    const result = await verifyActivation(
      await sign(base),
      params({ now: NOW + 16 * 60 * 1000 }),
    );
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts a storage grant beyond the URL window but before sxp', async () => {
    const result = await verifyActivation(
      await sign(base),
      params({ source: 'storage', now: NOW + 30 * 60 * 1000 }),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a storage grant past sxp', async () => {
    const result = await verifyActivation(
      await sign(base),
      params({ source: 'storage', now: NOW + 61 * 60 * 1000 }),
    );
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a URL grant past sxp even inside the 15 minute window', async () => {
    // Re-minted near session end: sxp = iat + 5 min. The URL window alone
    // would still accept at minute 10, so sxp must cap it.
    const short = { ...base, sxp: NOW / 1000 + 5 * 60 };
    const result = await verifyActivation(
      await sign(short),
      params({ now: NOW + 10 * 60 * 1000 }),
    );
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects an origin not in aud', async () => {
    const result = await verifyActivation(
      await sign(base),
      params({ origin: 'https://evil.example.com' }),
    );
    expect(result).toEqual({ ok: false, reason: 'aud-mismatch' });
  });

  it('rejects a lookalike origin that merely contains the allowed origin', async () => {
    // Exact-membership only: substring/prefix/suffix tricks must not match.
    const evilPrefix = await verifyActivation(
      await sign({
        ...base,
        aud: ['https://evil.com/https://shop.example.com'],
      }),
      params({ origin: 'https://shop.example.com' }),
    );
    expect(evilPrefix).toEqual({ ok: false, reason: 'aud-mismatch' });

    const evilSuffix = await verifyActivation(
      await sign({ ...base, aud: ['https://shop.example.com'] }),
      params({ origin: 'https://shop.example.com.evil.com' }),
    );
    expect(evilSuffix).toEqual({ ok: false, reason: 'aud-mismatch' });
  });

  it('rejects a grant from another project (pb mismatch)', async () => {
    const result = await verifyActivation(
      await sign({ ...base, pb: 'pb_project_b' }),
      params(),
    );
    expect(result).toEqual({ ok: false, reason: 'pb-mismatch' });
  });

  it('skips the pb check on an acceptForeign host but demands an allowlisted aud', async () => {
    const foreign = { ...base, pb: 'pb_project_b' };
    const ok = await verifyActivation(
      await sign(foreign),
      params({
        pb: 'pb_demo',
        acceptForeign: true,
        demoAllowlist: ['https://shop.example.com'],
      }),
    );
    expect(ok.ok).toBe(true);

    const bad = await verifyActivation(
      await sign({ ...foreign, aud: ['https://elsewhere.com'] }),
      params({
        origin: 'https://elsewhere.com',
        pb: 'pb_demo',
        acceptForeign: true,
        demoAllowlist: ['https://shop.example.com'],
      }),
    );
    expect(bad).toEqual({ ok: false, reason: 'aud-mismatch' });
  });

  it('rejects a demo grant whose aud is not a single origin', async () => {
    const multi = {
      ...base,
      pb: 'pb_project_b',
      aud: ['https://shop.example.com', 'https://two.example.com'],
    };
    const result = await verifyActivation(
      await sign(multi),
      params({
        pb: 'pb_demo',
        acceptForeign: true,
        demoAllowlist: ['https://shop.example.com', 'https://two.example.com'],
      }),
    );
    expect(result).toEqual({ ok: false, reason: 'aud-mismatch' });
  });

  it('enforces the demo single-origin aud rule even without an origin to check', async () => {
    // Container-side callers may omit `origin` entirely. acceptForeign's
    // allowlist gate must not be skippable just because origin is absent.
    const multi = {
      ...base,
      pb: 'pb_project_b',
      aud: ['https://shop.example.com', 'https://two.example.com'],
    };
    const result = await verifyActivation(
      await sign(multi),
      containerParams({
        pb: 'pb_demo',
        acceptForeign: true,
        demoAllowlist: ['https://shop.example.com', 'https://two.example.com'],
      }),
    );
    expect(result).toEqual({ ok: false, reason: 'aud-mismatch' });
  });

  it('cross-arm: an activation/forwarding pair each verify ONLY on their own arm', async () => {
    // The invariant the two-grant design rests on: ONE observe-session URL
    // carries a non-session activation grant (web arm) plus a session-bound
    // forwarding grant (container arm), and neither passes the other's arm.
    const activation = await sign(base);
    const forwarding = await sign({ ...base, ses: 'ses_1', sb: 'sb_one' });

    const webOk = await verifyActivation(activation, params());
    expect(webOk.ok).toBe(true);
    expect(await verifyActivation(forwarding, params())).toEqual({
      ok: false,
      reason: 'sb-mismatch',
    });

    const containerOk = await verifyActivation(forwarding, containerParams());
    expect(containerOk.ok).toBe(true);
    expect(await verifyActivation(activation, containerParams())).toEqual({
      ok: false,
      reason: 'sb-mismatch',
    });
  });

  it('fails closed when crypto.subtle is unavailable', async () => {
    const result = await verifyActivation(
      await sign(base),
      params({ crypto: {} }), // structural PreviewCrypto: a subtle-less environment
    );
    expect(result).toEqual({ ok: false, reason: 'no-subtle' });
  });

  it('rejects a session-bound grant whose sb does not match', async () => {
    const bound = { ...base, ses: 'ses_1', sb: 'sb_one' };
    const result = await verifyActivation(
      await sign(bound),
      containerParams({ expectSession: { ses: 'ses_1', sb: 'sb_two' } }),
    );
    expect(result).toEqual({ ok: false, reason: 'sb-mismatch' });
  });

  it('rejects a session-bound grant whose ses does not match', async () => {
    const bound = { ...base, ses: 'ses_1', sb: 'sb_one' };
    const result = await verifyActivation(
      await sign(bound),
      containerParams({ expectSession: { ses: 'ses_other', sb: 'sb_one' } }),
    );
    expect(result).toEqual({ ok: false, reason: 'sb-mismatch' });
  });

  it('rejects a session-bound grant whose sb is empty on both sides', async () => {
    // Restores the dropped `!grant.sb` truthiness guard: an empty string is
    // never a legitimate binding secret, so it must not trivially equal
    // itself across a misconfigured caller and a malformed grant.
    const bound = { ...base, ses: 'ses_1', sb: '' };
    const result = await verifyActivation(
      await sign(bound),
      containerParams({ expectSession: { ses: 'ses_1', sb: '' } }),
    );
    expect(result).toEqual({ ok: false, reason: 'sb-mismatch' });
  });

  it('rejects a session-scoped grant when no session binding is expected', async () => {
    // Symmetric with the check above: a grant minted for one session must not
    // silently pass at a host that never asked for a session binding.
    const bound = { ...base, ses: 'ses_1', sb: 'sb_one' };
    const result = await verifyActivation(await sign(bound), params());
    expect(result).toEqual({ ok: false, reason: 'sb-mismatch' });
  });

  it('accepts a session-bound grant whose ses and sb both match (legitimate container arm)', async () => {
    const bound = { ...base, ses: 'ses_1', sb: 'sb_one' };
    const result = await verifyActivation(
      await sign(bound),
      containerParams({ expectSession: { ses: 'ses_1', sb: 'sb_one' } }),
    );
    expect(result).toEqual({ ok: true, grant: bound });
  });

  it('cannot express a web-mode call that omits both origin and session binding (compile-time proof)', () => {
    // The only two arms are `{ origin: string }` and `{ expectSession: {...} }`.
    // A shape lacking both is the exact caller mistake that used to skip the
    // aud check silently; it must not satisfy VerifyParams. If it ever did,
    // the assignment below stops compiling: there is no ts-expect-error
    // hiding it, so a regression here breaks `tsc`, not just this assertion.
    type OmitsOriginAndSession = {
      keyring: PreviewKey[];
      iss: string;
      source: 'url';
      now: number;
    };
    type WouldRegress = OmitsOriginAndSession extends VerifyParams
      ? true
      : false;
    const stillRejected: WouldRegress = false;
    expect(stillRejected).toBe(false);
  });

  it('rejects a grant minted with an iat far in the future (mint clock cannot be trusted)', async () => {
    const futureIat = base.iat + 4 * 365 * 24 * 3600; // ~4 years ahead: not clock skew
    const grant = { ...base, iat: futureIat, sxp: futureIat + 3600 };
    const result = await verifyActivation(await sign(grant), params());
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a grant whose sxp - iat exceeds the verifier session ceiling', async () => {
    // iat stays "now" (not future); only the claimed session length is too long.
    const grant = { ...base, sxp: base.iat + (MAX_SESSION_MS + 60_000) / 1000 };
    const result = await verifyActivation(await sign(grant), params());
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts a grant whose iat sits just inside the clock-skew tolerance', async () => {
    const nearFutureIat = base.iat + (CLOCK_SKEW_MS - 1000) / 1000; // 1s inside tolerance
    const grant = { ...base, iat: nearFutureIat, sxp: nearFutureIat + 3600 };
    const result = await verifyActivation(await sign(grant), params());
    expect(result.ok).toBe(true);
  });
});
