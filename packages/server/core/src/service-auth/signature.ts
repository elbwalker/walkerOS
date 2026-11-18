import { createHash } from 'node:crypto';
import type { PrivateEcJwk, PublicEcJwk } from '@walkeros/core';
import { ascii, es256Sign, es256Verify, randomId } from './jws';

/**
 * HTTP message signatures (RFC 9421) for one fixed shape: label `sig1`, the
 * components `@method`, `@target-uri` and `content-digest`, the parameters
 * `created`, `nonce`, `keyid`, `alg` and `tag`, ECDSA P-256 with SHA-256.
 * Both sides are walkerOS's, so nothing else is taken.
 */

export const SIGNATURE_LABEL = 'sig1';
export const SIGNATURE_ALG = 'ecdsa-p256-sha256';
export const SIGNED_COMPONENTS = [
  '@method',
  '@target-uri',
  'content-digest',
] as const;
const SIGNATURE_PARAMS = ['created', 'nonce', 'keyid', 'alg', 'tag'] as const;
const DEFAULT_MAX_AGE_SECONDS = 60;

/** Why a signed request was refused; `unknown-key` is a keyid the caller has no key for. */
export type SignatureRefusal =
  | 'missing'
  | 'malformed'
  | 'label'
  | 'components'
  | 'params'
  | 'tag'
  | 'created'
  | 'unknown-key'
  | 'keyid'
  | 'alg'
  | 'digest'
  | 'signature';

/** `Content-Digest` (RFC 9530) of the body's exact bytes, the empty body included. */
export function contentDigest(body: Uint8Array): string {
  return `sha-256=:${createHash('sha256').update(body).digest('base64')}:`;
}

/** The RFC 7638 thumbprint of a P-256 key: its required members in lexicographic order, SHA-256, base64url. */
export function jwkThumbprint(jwk: {
  crv: string;
  kty: string;
  x: string;
  y: string;
}): string {
  const members = JSON.stringify({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  });
  return createHash('sha256').update(members).digest('base64url');
}

/** `@target-uri` (RFC 9421 section 2.2.2): the absolute URI without a fragment or user. */
function targetUri(url: string): string {
  const target = new URL(url);
  return `${target.origin}${target.pathname}${target.search}`;
}

const METHOD = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/** An sf-string (RFC 8941 section 4.1.6). */
function sfString(value: string): string {
  if (!/^[\x20-\x7e]*$/.test(value))
    throw new Error('A signature parameter holds a character outside ASCII');
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

type ParamValue = string | number;

/** The `@signature-params` value (RFC 9421 section 2.3), parameters in the given order. */
function signatureParams(
  components: readonly string[],
  params: ReadonlyArray<readonly [string, ParamValue]>,
): string {
  const list = components.map(sfString).join(' ');
  const tail = params
    .map(
      ([name, value]) =>
        `;${name}=${typeof value === 'number' ? String(value) : sfString(value)}`,
    )
    .join('');
  return `(${list})${tail}`;
}

/**
 * The signature base (RFC 9421 section 2.5) of the fixed component set: one
 * line per component, then the `@signature-params` line, no final newline.
 */
export function signatureBase(input: {
  method: string;
  url: string;
  contentDigest: string;
  params: string;
}): string {
  if (!METHOD.test(input.method))
    throw new Error('The request method is not an HTTP token');
  return [
    `"@method": ${input.method}`,
    `"@target-uri": ${targetUri(input.url)}`,
    `"content-digest": ${input.contentDigest}`,
    `"@signature-params": ${input.params}`,
  ].join('\n');
}

/** Verifies ECDSA P-256 SHA-256, `r||s` (RFC 9421 section 3.3.4), over a signature base. */
export function verifySignatureBase(
  base: string,
  signature: Uint8Array,
  key: PublicEcJwk,
): Promise<boolean> {
  return es256Verify(key, ascii(base), signature);
}

/** The three headers that sign one request with the credential's signing key. */
export async function signRequest(input: {
  method: string;
  url: string;
  body?: Uint8Array;
  key: PrivateEcJwk;
  tag: string;
  /** UNIX seconds; now when left out. */
  created?: number;
  nonce?: string;
}): Promise<{
  'Signature-Input': string;
  Signature: string;
  'Content-Digest': string;
}> {
  const digest = contentDigest(input.body || new Uint8Array(0));
  const params = signatureParams(SIGNED_COMPONENTS, [
    ['created', input.created ?? Math.floor(Date.now() / 1000)],
    ['nonce', input.nonce ?? randomId()],
    ['keyid', input.key.kid],
    ['alg', SIGNATURE_ALG],
    ['tag', input.tag],
  ]);
  const base = signatureBase({
    method: input.method,
    url: input.url,
    contentDigest: digest,
    params,
  });
  const signature = await es256Sign(input.key, ascii(base));
  return {
    'Signature-Input': `${SIGNATURE_LABEL}=${params}`,
    Signature: `${SIGNATURE_LABEL}=:${Buffer.from(signature).toString('base64')}:`,
    'Content-Digest': digest,
  };
}

type Refused = { ok: false; reason: SignatureRefusal };
const refuse = (reason: SignatureRefusal): Refused => ({ ok: false, reason });

/**
 * Checks a signed request: one signature `sig1` over exactly the fixed
 * components, every parameter present, the `tag` asked for, `created` within
 * `maxAgeSeconds` either way, the key's thumbprint as `keyid`, `alg` from the
 * key, `Content-Digest` of the body, then the signature. `key` may be a lookup
 * by keyid, called once the header is parsed; a keyid it has no key for is
 * `unknown-key`.
 */
export async function verifyRequestSignature(input: {
  method: string;
  url: string;
  headers: Headers;
  body: Uint8Array;
  key: PublicEcJwk | ((keyid: string) => Promise<PublicEcJwk | undefined>);
  tag: string;
  /** ms since the epoch, as `Date.now()`. */
  now?: number;
  maxAgeSeconds?: number;
}): Promise<
  | { ok: true; keyid: string; nonce: string; created: number }
  | { ok: false; reason: SignatureRefusal }
> {
  const signatureInput = input.headers.get('signature-input');
  const signatureField = input.headers.get('signature');
  if (signatureInput === null || signatureField === null)
    return refuse('missing');

  const inputs = parseDictionary(signatureInput);
  const signatures = parseDictionary(signatureField);
  if (!inputs || !signatures) return refuse('malformed');
  if (inputs.length !== 1 || signatures.length !== 1) return refuse('label');
  const [[inputLabel, member]] = inputs;
  const [[signatureLabel, signatureMember]] = signatures;
  if (inputLabel !== SIGNATURE_LABEL || signatureLabel !== SIGNATURE_LABEL)
    return refuse('label');
  if (member.kind !== 'inner') return refuse('malformed');
  const signature = bytesOf(signatureMember);
  if (!signature) return refuse('malformed');

  const components = member.items.map((item) =>
    item.value.type === 'string' && item.params.length === 0
      ? item.value.value
      : undefined,
  );
  if (
    components.length !== SIGNED_COMPONENTS.length ||
    components.some((name, i) => name !== SIGNED_COMPONENTS[i])
  )
    return refuse('components');

  const read = readParams(member.params);
  if (!read) return refuse('params');
  const { params, ordered } = read;
  if (params.tag !== input.tag) return refuse('tag');
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  const maxAge = input.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  if (Math.abs(now - params.created) > maxAge) return refuse('created');

  const key =
    typeof input.key === 'function' ? await input.key(params.keyid) : input.key;
  if (!key) return refuse('unknown-key');
  if (jwkThumbprint(key) !== params.keyid) return refuse('keyid');
  if (algOf(key) !== params.alg) return refuse('alg');

  const digest = input.headers.get('content-digest');
  if (digest === null || digest.trim() !== contentDigest(input.body))
    return refuse('digest');

  let base: string;
  try {
    base = signatureBase({
      method: input.method,
      url: input.url,
      contentDigest: digest.trim(),
      params: signatureParams(SIGNED_COMPONENTS, ordered),
    });
  } catch {
    return refuse('malformed');
  }
  let verified: boolean;
  try {
    verified = await verifySignatureBase(base, signature, key);
  } catch {
    verified = false;
  }
  if (!verified) return refuse('signature');
  return {
    ok: true,
    keyid: params.keyid,
    nonce: params.nonce,
    created: params.created,
  };
}

/** The HTTP signature algorithm a key stands for: only a P-256 signing key has one here. */
function algOf(key: PublicEcJwk): string | undefined {
  if (key.kty !== 'EC' || key.crv !== 'P-256') return undefined;
  if (key.use !== undefined && key.use !== 'sig') return undefined;
  if (key.alg !== undefined && key.alg !== 'ES256') return undefined;
  return SIGNATURE_ALG;
}

interface Params {
  created: number;
  nonce: string;
  keyid: string;
  alg: string;
  tag: string;
}

/** The bytes of a Signature member: a byte sequence with no parameters. */
function bytesOf(member: Member): Uint8Array | undefined {
  if (member.kind !== 'item' || member.params.length > 0) return undefined;
  return member.value.type === 'bytes' ? member.value.value : undefined;
}

/**
 * Every signature parameter exactly once, of its type, and no other; with
 * them in their received order, from which `@signature-params` is rebuilt.
 */
function readParams(params: ReadonlyArray<readonly [string, BareItem]>):
  | {
      params: Params;
      ordered: Array<readonly [string, ParamValue]>;
    }
  | undefined {
  const names = params.map(([name]) => name);
  if (
    names.length !== SIGNATURE_PARAMS.length ||
    !SIGNATURE_PARAMS.every((name) => names.includes(name))
  )
    return undefined;
  const read = new Map(params);
  const created = read.get('created');
  const nonce = read.get('nonce');
  const keyid = read.get('keyid');
  const alg = read.get('alg');
  const tag = read.get('tag');
  if (
    created?.type !== 'integer' ||
    nonce?.type !== 'string' ||
    keyid?.type !== 'string' ||
    alg?.type !== 'string' ||
    tag?.type !== 'string'
  )
    return undefined;
  const ordered: Array<readonly [string, ParamValue]> = [];
  for (const [name, item] of params)
    if (item.type === 'integer' || item.type === 'string')
      ordered.push([name, item.value]);
  return {
    params: {
      created: created.value,
      nonce: nonce.value,
      keyid: keyid.value,
      alg: alg.value,
      tag: tag.value,
    },
    ordered,
  };
}

// A strict parser for the RFC 8941 Dictionary forms the two signature fields
// use: inner lists of strings and byte-sequence items, with parameters. A
// form outside them (a decimal, a duplicate key) fails the parse.

type BareItem =
  | { type: 'string'; value: string }
  | { type: 'integer'; value: number }
  | { type: 'token'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'bytes'; value: Uint8Array };

interface Item {
  value: BareItem;
  params: Array<readonly [string, BareItem]>;
}

type Member =
  | ({ kind: 'item' } & Item)
  | {
      kind: 'inner';
      items: Item[];
      params: Array<readonly [string, BareItem]>;
    };

const KEY_FIRST = /[a-z*]/;
const KEY_CHAR = /[a-z0-9_\-.*]/;
const TOKEN_FIRST = /[A-Za-z*]/;
const TOKEN_CHAR = /[!#$%&'*+\-.^_`|~0-9A-Za-z:/]/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

class Reader {
  private at = 0;
  constructor(private readonly text: string) {}

  peek(): string {
    return this.text.charAt(this.at);
  }

  done(): boolean {
    return this.at >= this.text.length;
  }

  take(): string {
    return this.text.charAt(this.at++);
  }

  skip(pattern: RegExp): void {
    while (!this.done() && pattern.test(this.peek())) this.at++;
  }
}

/** The members of a Dictionary in order, or undefined when it does not parse. */
function parseDictionary(
  text: string,
): Array<readonly [string, Member]> | undefined {
  const reader = new Reader(text.trim());
  const members: Array<readonly [string, Member]> = [];
  try {
    while (!reader.done()) {
      const key = parseKey(reader);
      if (members.some(([name]) => name === key)) return undefined;
      let member: Member;
      if (reader.peek() === '=') {
        reader.take();
        member = parseMember(reader);
      } else {
        member = {
          kind: 'item',
          value: { type: 'boolean', value: true },
          params: parseParams(reader),
        };
      }
      members.push([key, member]);
      reader.skip(/[ \t]/);
      if (reader.done()) break;
      if (reader.take() !== ',') return undefined;
      reader.skip(/[ \t]/);
      if (reader.done()) return undefined;
    }
  } catch {
    return undefined;
  }
  return members.length > 0 ? members : undefined;
}

function parseMember(reader: Reader): Member {
  if (reader.peek() !== '(') return { kind: 'item', ...parseItem(reader) };
  reader.take();
  const items: Item[] = [];
  while (true) {
    reader.skip(/ /);
    if (reader.peek() === ')') {
      reader.take();
      return { kind: 'inner', items, params: parseParams(reader) };
    }
    items.push(parseItem(reader));
    const next = reader.peek();
    if (next !== ' ' && next !== ')') throw new Error('inner list');
  }
}

function parseItem(reader: Reader): Item {
  return { value: parseBareItem(reader), params: parseParams(reader) };
}

function parseParams(reader: Reader): Array<readonly [string, BareItem]> {
  const params: Array<readonly [string, BareItem]> = [];
  while (reader.peek() === ';') {
    reader.take();
    reader.skip(/ /);
    const key = parseKey(reader);
    if (params.some(([name]) => name === key)) throw new Error('duplicate');
    let value: BareItem = { type: 'boolean', value: true };
    if (reader.peek() === '=') {
      reader.take();
      value = parseBareItem(reader);
    }
    params.push([key, value]);
  }
  return params;
}

function parseKey(reader: Reader): string {
  if (!KEY_FIRST.test(reader.peek())) throw new Error('key');
  let key = reader.take();
  while (!reader.done() && KEY_CHAR.test(reader.peek())) key += reader.take();
  return key;
}

function parseBareItem(reader: Reader): BareItem {
  const first = reader.peek();
  if (first === '-' || /[0-9]/.test(first)) return parseInteger(reader);
  if (first === '"') return parseString(reader);
  if (first === ':') return parseBytes(reader);
  if (first === '?') {
    reader.take();
    const flag = reader.take();
    if (flag !== '0' && flag !== '1') throw new Error('boolean');
    return { type: 'boolean', value: flag === '1' };
  }
  if (TOKEN_FIRST.test(first)) {
    let token = reader.take();
    while (!reader.done() && TOKEN_CHAR.test(reader.peek()))
      token += reader.take();
    return { type: 'token', value: token };
  }
  throw new Error('bare item');
}

function parseInteger(reader: Reader): BareItem {
  let digits = reader.peek() === '-' ? reader.take() : '';
  while (!reader.done() && /[0-9]/.test(reader.peek())) digits += reader.take();
  if (!/^-?[0-9]{1,15}$/.test(digits) || reader.peek() === '.')
    throw new Error('integer');
  return { type: 'integer', value: Number(digits) };
}

function parseString(reader: Reader): BareItem {
  reader.take();
  let value = '';
  while (!reader.done()) {
    const char = reader.take();
    if (char === '\\') {
      const escaped = reader.take();
      if (escaped !== '"' && escaped !== '\\') throw new Error('escape');
      value += escaped;
    } else if (char === '"') {
      return { type: 'string', value };
    } else if (/[\x20-\x7e]/.test(char)) {
      value += char;
    } else {
      throw new Error('string');
    }
  }
  throw new Error('string');
}

function parseBytes(reader: Reader): BareItem {
  reader.take();
  let encoded = '';
  while (!reader.done() && reader.peek() !== ':') encoded += reader.take();
  if (reader.take() !== ':' || !BASE64.test(encoded)) throw new Error('bytes');
  const value = new Uint8Array(Buffer.from(encoded, 'base64'));
  if (Buffer.from(value).toString('base64') !== encoded)
    throw new Error('bytes');
  return { type: 'bytes', value };
}
