import { createHash } from 'node:crypto';
import type { PrivateEcJwk, PublicEcJwk } from '@walkeros/core';
import type {
  DoorCheckOptions,
  DoorDecision,
  DoorLimits,
  DoorRefusal,
  DoorRequest,
} from '../../service-auth/door-check';
import {
  DOOR_LIMITS,
  createDoorCheck,
  createDoorCheckWithLimits,
} from '../../service-auth/door-check';
import { ascii, es256Sign } from '../../service-auth/jws';
import { signRequest } from '../../service-auth/signature';
import {
  B22_SIGNATURE_BASE,
  B22_SIGNATURE_PARAMS,
  B26_SIGNATURE,
  B26_SIGNATURE_INPUT,
  B2_TEST_REQUEST,
  TEST_KEY_ECC_P256,
  TEST_KEY_THUMBPRINT,
} from './rfc9421-vectors';

const DOOR = 'https://ingest.walkeros.io';
const EVENTS = '/events';
const T0 = 1_800_000_000_000;
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const STARTED = T0 - 30 * SECOND;
const BODY = '{"name":"page view"}\n';

const { kty, crv, x, y, d } = TEST_KEY_ECC_P256;
const publicKey: PublicEcJwk = { kty, crv, x, y };
const signingKey: PrivateEcJwk = {
  kty,
  crv,
  x,
  y,
  d,
  kid: TEST_KEY_THUMBPRINT,
  use: 'sig',
  alg: 'ES256',
};

const bytes = (text: string) => new Uint8Array(Buffer.from(text, 'utf8'));

const pass: DoorDecision = { ok: true, keyid: TEST_KEY_THUMBPRINT };
const refused = (reason: DoorRefusal): DoorDecision => ({
  ok: false,
  status: 403,
  reason,
});
const newKey: DoorDecision = {
  ok: false,
  status: 503,
  retryAfter: 5,
  reason: 'unknown-key',
};
const beforeStart: DoorDecision = {
  ok: false,
  status: 503,
  retryAfter: 1,
  reason: 'created-before-start',
};
const storeFull: DoorDecision = {
  ok: false,
  status: 503,
  retryAfter: 1,
  reason: 'replay-store-full',
};

/** A door on a clock the test moves, counting its lookups and refreshes. */
function door(options: Partial<DoorCheckOptions> = {}, limits?: DoorLimits) {
  const state = {
    now: T0,
    keys: new Map<string, PublicEcJwk>([[TEST_KEY_THUMBPRINT, publicKey]]),
    lookups: 0,
    refreshes: 0,
    onRefresh: async (): Promise<void> => undefined,
  };
  const doorOptions: DoorCheckOptions = {
    tag: 'walkeros-ingest',
    lookup: async (keyid) => {
      state.lookups += 1;
      return state.keys.get(keyid);
    },
    refresh: () => {
      state.refreshes += 1;
      return state.onRefresh();
    },
    startedAt: STARTED,
    now: () => state.now,
    ...options,
  };
  const doorCheck = limits
    ? createDoorCheckWithLimits(doorOptions, limits)
    : createDoorCheck(doorOptions);
  return {
    state,
    check: (request: DoorRequest) => doorCheck.check(request),
  };
}

type Door = ReturnType<typeof door>;

interface Signing {
  url?: string;
  tag?: string;
  /** ms since the epoch. */
  created?: number;
  nonce?: string;
  kid?: string;
}

/** A write to the door's /events, signed as a runner signs it. */
async function signed(signing: Signing = {}): Promise<DoorRequest> {
  const body = bytes(BODY);
  const headers = await signRequest({
    method: 'POST',
    url: signing.url ?? `${DOOR}${EVENTS}`,
    body,
    key: signing.kid ? { ...signingKey, kid: signing.kid } : signingKey,
    tag: signing.tag ?? 'walkeros-ingest',
    created: Math.floor((signing.created ?? T0) / 1000),
    nonce: signing.nonce ?? 'nonce-1',
  });
  return {
    origin: DOOR,
    method: 'POST',
    target: EVENTS,
    headers: new Headers(headers),
    body,
  };
}

/** The same request with one header rewritten, or left out when `change` answers undefined. */
function rewrite(
  request: DoorRequest,
  name: string,
  change: (value: string) => string | undefined,
): DoorRequest {
  const headers = new Headers(request.headers);
  const value = change(headers.get(name) ?? '');
  if (value === undefined) headers.delete(name);
  else headers.set(name, value);
  return { ...request, headers };
}

const withKeyid = (request: DoorRequest, keyid: string) =>
  rewrite(request, 'signature-input', (value) =>
    value.replace(`keyid="${TEST_KEY_THUMBPRINT}"`, `keyid="${keyid}"`),
  );

/** Appendix B.2's test-request with the given signature fields. */
function testRequest(signatureInput: string, signature: string): DoorRequest {
  const { origin, method, target, headers, body } = B2_TEST_REQUEST;
  return {
    origin,
    method,
    target,
    headers: new Headers({
      ...headers,
      'Signature-Input': signatureInput,
      Signature: signature,
    }),
    body: bytes(body),
  };
}

/** Appendix B.2's test-request signed with test-key-ecc-p256 over `params`, by the base `base`. */
async function testRequestSignedOver(
  params: string,
  base: string,
): Promise<DoorRequest> {
  const signature = await es256Sign(signingKey, ascii(base));
  return testRequest(
    `sig1=${params}`,
    `sig1=:${Buffer.from(signature).toString('base64')}:`,
  );
}

interface Row {
  name: string;
  options?: Partial<DoorCheckOptions>;
  limits?: DoorLimits;
  run: (door: Door) => Promise<DoorDecision[]>;
  expected: { decisions: DoorDecision[]; lookups: number; refreshes: number };
}

const once = async (
  door: Door,
  request: DoorRequest | Promise<DoorRequest>,
) => [await door.check(await request)];

describe('createDoorCheck', () => {
  it.each<Row>([
    {
      name: 'a good signed write passes',
      run: (door) => once(door, signed()),
      expected: { decisions: [pass], lookups: 1, refreshes: 0 },
    },
    ...['Signature-Input', 'Signature', 'Content-Digest'].map(
      (header): Row => ({
        name: `a write without ${header}: 403 missing`,
        run: async (door) =>
          once(
            door,
            rewrite(await signed(), header, () => undefined),
          ),
        expected: { decisions: [refused('missing')], lookups: 0, refreshes: 0 },
      }),
    ),
    {
      name: "another door's tag: 403 before any lookup",
      run: (door) => once(door, signed({ tag: 'walkeros-read' })),
      expected: { decisions: [refused('tag')], lookups: 0, refreshes: 0 },
    },
    {
      name: 'a component missing: 403 before any lookup',
      run: async (door) =>
        once(
          door,
          rewrite(await signed(), 'signature-input', (value) =>
            value.replace(' "content-digest"', ''),
          ),
        ),
      expected: {
        decisions: [refused('components')],
        lookups: 0,
        refreshes: 0,
      },
    },
    {
      name: 'a component extra: 403 before any lookup',
      run: async (door) =>
        once(
          door,
          rewrite(await signed(), 'signature-input', (value) =>
            value.replace('"content-digest")', '"content-digest" "host")'),
          ),
        ),
      expected: {
        decisions: [refused('components')],
        lookups: 0,
        refreshes: 0,
      },
    },
    {
      name: 'two signatures: 403 before any lookup',
      run: async (door) =>
        once(
          door,
          rewrite(
            await signed(),
            'signature-input',
            (value) => `${value}, sig2=${value.slice('sig1='.length)}`,
          ),
        ),
      expected: { decisions: [refused('label')], lookups: 0, refreshes: 0 },
    },
    {
      name: 'no nonce: 403 before any lookup',
      run: async (door) =>
        once(
          door,
          rewrite(await signed(), 'signature-input', (value) =>
            value.replace(';nonce="nonce-1"', ''),
          ),
        ),
      expected: { decisions: [refused('params')], lookups: 0, refreshes: 0 },
    },
    {
      name: "an alg unlike the key's: 403 before any lookup",
      run: async (door) =>
        once(
          door,
          rewrite(await signed(), 'signature-input', (value) =>
            value.replace('ecdsa-p256-sha256', 'ed25519'),
          ),
        ),
      expected: { decisions: [refused('alg')], lookups: 0, refreshes: 0 },
    },
    {
      name: 'a nonce of 64 characters passes',
      run: (door) => once(door, signed({ nonce: 'n'.repeat(64) })),
      expected: { decisions: [pass], lookups: 1, refreshes: 0 },
    },
    {
      name: 'a nonce of 65 characters: 403 before any lookup',
      run: (door) => once(door, signed({ nonce: 'n'.repeat(65) })),
      expected: {
        decisions: [refused('nonce-too-long')],
        lookups: 0,
        refreshes: 0,
      },
    },
    ...[44, 2_000].map(
      (length): Row => ({
        name: `a keyid of ${length} characters: 403 before any lookup, so nothing is recorded`,
        run: (door) => once(door, signed({ kid: 'A'.repeat(length) })),
        expected: {
          decisions: [refused('keyid-shape')],
          lookups: 0,
          refreshes: 0,
        },
      }),
    ),
    {
      name: 'created 61 seconds old: 403 before any lookup',
      run: (door) => once(door, signed({ created: T0 - 61 * SECOND })),
      expected: { decisions: [refused('created')], lookups: 0, refreshes: 0 },
    },
    {
      name: 'created 5 seconds ahead passes',
      run: (door) => once(door, signed({ created: T0 + 5 * SECOND })),
      expected: { decisions: [pass], lookups: 1, refreshes: 0 },
    },
    {
      name: 'created 6 seconds ahead: 403 created-ahead',
      run: (door) => once(door, signed({ created: T0 + 6 * SECOND })),
      expected: {
        decisions: [refused('created-ahead')],
        lookups: 1,
        refreshes: 0,
      },
    },
    {
      name: 'a body changed under its signature: 403',
      run: async (door) =>
        once(door, {
          ...(await signed()),
          body: bytes('{"name":"order complete"}\n'),
        }),
      expected: { decisions: [refused('digest')], lookups: 1, refreshes: 0 },
    },
    {
      name: 'another method: 403',
      run: async (door) => once(door, { ...(await signed()), method: 'PUT' }),
      expected: { decisions: [refused('signature')], lookups: 1, refreshes: 0 },
    },
    {
      name: 'a signature made for another origin: 403',
      run: (door) =>
        once(door, signed({ url: `https://other.example${EVENTS}` })),
      expected: { decisions: [refused('signature')], lookups: 1, refreshes: 0 },
    },
    {
      name: 'the same at the door with a Host header naming that origin: 403',
      run: async (door) =>
        once(
          door,
          rewrite(
            await signed({ url: `https://other.example${EVENTS}` }),
            'host',
            () => 'other.example',
          ),
        ),
      expected: { decisions: [refused('signature')], lookups: 1, refreshes: 0 },
    },
    {
      name: 'a target that would move the URL to the signed origin: 403 before any lookup',
      run: async (door) =>
        once(door, {
          ...(await signed({ url: `https://other.example${EVENTS}` })),
          target: `@other.example${EVENTS}`,
        }),
      expected: { decisions: [refused('malformed')], lookups: 0, refreshes: 0 },
    },
    {
      name: 'created before the start: 503, and the request signed again with a fresh created passes',
      run: async (door) => [
        await door.check(await signed({ created: STARTED - 10 * SECOND })),
        await door.check(await signed()),
      ],
      expected: { decisions: [beforeStart, pass], lookups: 2, refreshes: 0 },
    },
    {
      name: 'the same keyid and nonce twice within 120 seconds: the second 403 replay',
      run: async (door) => {
        const request = await signed();
        const first = await door.check(request);
        door.state.now = T0 + 59 * SECOND;
        return [first, await door.check(request)];
      },
      expected: {
        decisions: [pass, refused('replay')],
        lookups: 2,
        refreshes: 0,
      },
    },
    {
      name: 'a nonce signed anew 121 seconds later passes, its entry gone',
      run: async (door) => {
        const first = await door.check(await signed());
        door.state.now = T0 + 121 * SECOND;
        return [
          first,
          await door.check(await signed({ created: door.state.now })),
        ];
      },
      expected: { decisions: [pass, pass], lookups: 2, refreshes: 0 },
    },
    {
      name: 'an unknown keyid the lookup never answered: one refresh, then 503',
      run: (door) => {
        door.state.keys.clear();
        return once(door, signed());
      },
      expected: { decisions: [newKey], lookups: 2, refreshes: 1 },
    },
    {
      name: 'a keyid the refresh brings passes',
      run: (door) => {
        door.state.keys.clear();
        door.state.onRefresh = async () => {
          door.state.keys.set(TEST_KEY_THUMBPRINT, publicKey);
        };
        return once(door, signed());
      },
      expected: { decisions: [pass], lookups: 2, refreshes: 1 },
    },
    {
      name: 'a refresh that never settles: the check answers after 2 seconds',
      run: async (door) => {
        const request = await signed();
        door.state.keys.clear();
        jest.useFakeTimers({
          doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'],
        });
        try {
          const asked = new Promise<void>((resolve) => {
            door.state.onRefresh = () => {
              resolve();
              return new Promise<void>(() => undefined);
            };
          });
          const decision = door.check(request);
          await asked;
          await jest.advanceTimersByTimeAsync(1_999);
          const early = await Promise.race([
            decision,
            Promise.resolve('waiting'),
          ]);
          await jest.advanceTimersByTimeAsync(1);
          expect(early).toBe('waiting');
          return [await decision];
        } finally {
          jest.useRealTimers();
        }
      },
      expected: { decisions: [newKey], lookups: 2, refreshes: 1 },
    },
    {
      name: 'never answered, 9 minutes 59 seconds after its first sight: 503',
      run: async (door) => {
        door.state.keys.clear();
        const first = await door.check(await signed());
        door.state.now = T0 + 10 * MINUTE - SECOND;
        return [
          first,
          await door.check(await signed({ created: door.state.now })),
        ];
      },
      expected: { decisions: [newKey, newKey], lookups: 4, refreshes: 2 },
    },
    {
      name: 'never answered, 10 minutes after its first sight: 403',
      run: async (door) => {
        door.state.keys.clear();
        const first = await door.check(await signed());
        door.state.now = T0 + 10 * MINUTE;
        return [
          first,
          await door.check(await signed({ created: door.state.now })),
        ];
      },
      expected: {
        decisions: [newKey, refused('unknown-key')],
        lookups: 4,
        refreshes: 2,
      },
    },
    {
      name: 'a keyid the lookup answered and then dropped: 403 at once',
      run: async (door) => {
        const first = await door.check(await signed());
        door.state.keys.clear();
        return [first, await door.check(await signed({ nonce: 'nonce-2' }))];
      },
      expected: {
        decisions: [pass, refused('unknown-key')],
        lookups: 3,
        refreshes: 1,
      },
    },
    {
      name: "another door's tag under an unknown keyid: 403, no lookup and no refresh",
      run: (door) => {
        door.state.keys.clear();
        return once(door, signed({ tag: 'walkeros-read' }));
      },
      expected: { decisions: [refused('tag')], lookups: 0, refreshes: 0 },
    },
    {
      name: 'the least recently used keyid leaves the first-seen map first',
      options: { refresh: undefined },
      limits: { keyids: 2, replays: DOOR_LIMITS.replays },
      run: async (door) => {
        const now = await signed();
        const sight = (keyid: string) => door.check(withKeyid(now, keyid));
        const seen = [
          await sight('a'.repeat(43)),
          await sight('b'.repeat(43)),
          await sight('a'.repeat(43)),
          await sight('c'.repeat(43)),
        ];
        door.state.now = T0 + 10 * MINUTE;
        const later = await signed({ created: door.state.now });
        return [
          ...seen,
          await door.check(withKeyid(later, 'a'.repeat(43))),
          await door.check(withKeyid(later, 'b'.repeat(43))),
        ];
      },
      expected: {
        decisions: [
          newKey,
          newKey,
          newKey,
          newKey,
          refused('unknown-key'),
          newKey,
        ],
        lookups: 6,
        refreshes: 0,
      },
    },
    {
      name: '10,000 random keyids leave 4,096 in the first-seen map',
      options: { refresh: undefined },
      run: async (door) => {
        const keyids = Array.from({ length: 10_000 }, (_, i) =>
          createHash('sha256').update(`keyid ${i}`).digest('base64url'),
        );
        const now = await signed();
        let last: DoorDecision = pass;
        for (const keyid of keyids)
          last = await door.check(withKeyid(now, keyid));
        door.state.now = T0 + 10 * MINUTE;
        const later = await signed({ created: door.state.now });
        // The oldest keyid still held is past its 10 minutes; the one before
        // it was evicted, so it is seen anew.
        const held = await door.check(withKeyid(later, keyids[10_000 - 4_096]));
        const evicted = await door.check(
          withKeyid(later, keyids[10_000 - 4_097]),
        );
        return [last, held, evicted];
      },
      expected: {
        decisions: [newKey, refused('unknown-key'), newKey],
        lookups: 10_002,
        refreshes: 0,
      },
    },
    {
      name: 'a full replay store: 503, and a replay of a stored entry is still 403',
      limits: { keyids: DOOR_LIMITS.keyids, replays: 2 },
      run: async (door) => [
        await door.check(await signed({ nonce: 'nonce-1' })),
        await door.check(await signed({ nonce: 'nonce-2' })),
        await door.check(await signed({ nonce: 'nonce-3' })),
        await door.check(await signed({ nonce: 'nonce-1' })),
      ],
      expected: {
        decisions: [pass, pass, storeFull, refused('replay')],
        lookups: 4,
        refreshes: 0,
      },
    },
    {
      name: 'a full replay store takes new nonces again once its entries expire',
      limits: { keyids: DOOR_LIMITS.keyids, replays: 1 },
      run: async (door) => {
        const first = await door.check(await signed({ nonce: 'nonce-1' }));
        const full = await door.check(await signed({ nonce: 'nonce-2' }));
        door.state.now = T0 + 121 * SECOND;
        const later = await door.check(
          await signed({ nonce: 'nonce-2', created: door.state.now }),
        );
        return [first, full, later];
      },
      expected: {
        decisions: [pass, storeFull, pass],
        lookups: 3,
        refreshes: 0,
      },
    },
    {
      name: "Appendix B.2.6's Ed25519 request as published: 403 before any lookup",
      run: (door) => {
        door.state.now = B2_TEST_REQUEST.at;
        return once(door, testRequest(B26_SIGNATURE_INPUT, B26_SIGNATURE));
      },
      expected: { decisions: [refused('label')], lookups: 0, refreshes: 0 },
    },
    {
      name: "test-request signed with test-key-ecc-p256 over B.2.2's covered set: 403 before any lookup",
      run: async (door) => {
        door.state.now = B2_TEST_REQUEST.at;
        const ours = (text: string) =>
          text.replace('test-key-rsa-pss', TEST_KEY_THUMBPRINT);
        return once(
          door,
          testRequestSignedOver(
            ours(B22_SIGNATURE_PARAMS),
            ours(B22_SIGNATURE_BASE),
          ),
        );
      },
      expected: {
        decisions: [refused('components')],
        lookups: 0,
        refreshes: 0,
      },
    },
    {
      name: "test-request signed over our set with B.2.2's parameters (no nonce, no alg): 403 before any lookup",
      run: async (door) => {
        door.state.now = B2_TEST_REQUEST.at;
        const { origin, target, headers } = B2_TEST_REQUEST;
        const params = `("@method" "@target-uri" "content-digest");created=1618884473;keyid="${TEST_KEY_THUMBPRINT}";tag="header-example"`;
        const base = [
          '"@method": POST',
          `"@target-uri": ${origin}${target}`,
          `"content-digest": ${headers['Content-Digest']}`,
          `"@signature-params": ${params}`,
        ].join('\n');
        return once(door, testRequestSignedOver(params, base));
      },
      expected: { decisions: [refused('params')], lookups: 0, refreshes: 0 },
    },
  ])('$name', async ({ options, limits, run, expected }) => {
    const subject = door(options, limits);
    const decisions = await run(subject);
    expect({
      decisions,
      lookups: subject.state.lookups,
      refreshes: subject.state.refreshes,
    }).toEqual(expected);
  });

  it('bounds its memory: 4,096 keyids and 65,536 live replay entries', () => {
    expect(DOOR_LIMITS).toEqual({ keyids: 4_096, replays: 65_536 });
  });
});
