/**
 * The service credential: one string a runner, a data agent or an automation
 * holds, made by the app's auth server and read by every holder with the one
 * check below. The checks are written by hand, with no schema library: this
 * module is on core's main entry, which every web and server package loads.
 */

/** Every credential string starts with it, so secret scanners and the redactor know it. */
export const SERVICE_CREDENTIAL_PREFIX = 'wos_cred_';

/** What a credential is for: a runner, a data agent, or a person's scripts and CI. */
export const SERVICE_TARGET_KINDS = [
  'deployment',
  'data-plane',
  'automation',
] as const;

export type ServiceTargetKind = (typeof SERVICE_TARGET_KINDS)[number];

/** A public P-256 key as JWK (RFC 7517), as the app's copy holds it. */
export interface PublicEcJwk {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  kid?: string;
  use?: 'sig' | 'enc';
  alg?: 'ES256' | 'ECDH-ES';
}

/** A private P-256 key as JWK, its `kid` the RFC 7638 thumbprint. */
export interface PrivateEcJwk {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  d: string;
  kid: string;
  use: 'sig' | 'enc';
  alg: 'ES256' | 'ECDH-ES';
}

export interface ServiceCredential {
  v: 1;
  /** The auth server's issuer identifier (RFC 8414). */
  iss: string;
  /** The default audience of the tokens it buys (RFC 8707), the app's API. */
  resource: string;
  client_id: string;
  target: { kind: ServiceTargetKind; id: string };
  /** Signs assertions, DPoP proofs and requests. */
  sig: PrivateEcJwk;
  /** Opens what the app seals to this credential. */
  enc: PrivateEcJwk;
}

/** A token answer of the service token endpoint (RFC 6749 section 5.1). */
export interface ServiceTokenResponse {
  access_token: string;
  token_type: 'DPoP' | 'Bearer';
  expires_in: number;
  scope: string;
}

/** The members of the auth server's metadata (RFC 8414) a credential holder reads. */
export interface ServiceAuthMetadata {
  issuer: string;
  service_token_endpoint: string;
  dpop_signing_alg_values_supported: string[];
}

/** Visible ASCII, no space: what a URL, an id or a header value may hold here. */
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;

/** The app's ids: a prefix, an underscore and its id alphabet. */
const ID = /^[A-Za-z0-9_-]{1,255}$/;

/** 32 bytes in base64url without padding: a P-256 coordinate, a scalar, a SHA-256 thumbprint. */
const BASE64URL_32 = /^[A-Za-z0-9_-]{43}$/;

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const CREDENTIAL_MEMBERS = [
  'v',
  'iss',
  'resource',
  'client_id',
  'target',
  'sig',
  'enc',
];
const TARGET_MEMBERS = ['kind', 'id'];
const KEY_MEMBERS = ['kty', 'crv', 'x', 'y', 'd', 'kid', 'use', 'alg'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether `value` holds a member outside `members`, `__proto__` included. */
function hasOtherMember(
  value: Record<string, unknown>,
  members: readonly string[],
): boolean {
  return Object.keys(value).some((name) => !members.includes(name));
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && ID.test(value);
}

function isBase64Url32(value: unknown): value is string {
  return typeof value === 'string' && BASE64URL_32.test(value);
}

function isTargetKind(value: unknown): value is ServiceTargetKind {
  return SERVICE_TARGET_KINDS.some((kind) => kind === value);
}

/**
 * Plain http is taken only where no other host reads the traffic: a loopback
 * host, or a private RFC 1918 address such as a local Docker bridge.
 */
export function isLocalHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname === '[::1]') return true;
  const ipv4 = IPV4.exec(hostname);
  if (!ipv4) return false;
  const a = Number(ipv4[1]);
  const b = Number(ipv4[2]);
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** An https URL, or http on a local host; no user, query or fragment. */
function isServiceUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !VISIBLE_ASCII.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password || url.search || url.hash) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && isLocalHost(url.hostname);
}

/** Where a credential breaks its shape: the member's path, never its value. */
class Fault {
  constructor(readonly at: string) {}
}

/** A private key of exactly the members, curve and use the slot takes. */
function readKey(
  value: unknown,
  slot: 'sig' | 'enc',
  alg: 'ES256' | 'ECDH-ES',
): PrivateEcJwk | Fault {
  if (!isRecord(value)) return new Fault(slot);
  if (hasOtherMember(value, KEY_MEMBERS))
    return new Fault(`an unknown member in ${slot}`);
  const { kty, crv, x, y, d, kid } = value;
  if (kty !== 'EC') return new Fault(`${slot}.kty`);
  if (crv !== 'P-256') return new Fault(`${slot}.crv`);
  if (!isBase64Url32(x)) return new Fault(`${slot}.x`);
  if (!isBase64Url32(y)) return new Fault(`${slot}.y`);
  if (!isBase64Url32(d)) return new Fault(`${slot}.d`);
  if (!isBase64Url32(kid)) return new Fault(`${slot}.kid`);
  if (value.use !== slot) return new Fault(`${slot}.use`);
  if (value.alg !== alg) return new Fault(`${slot}.alg`);
  return { kty, crv, x, y, d, kid, use: slot, alg };
}

/**
 * The credential `value` holds, or where it breaks the shape: exactly its
 * members, `v` 1, `iss` and `resource` service URLs, the ids, a known target
 * kind, and two private P-256 keys, `sig` for ES256 and `enc` for ECDH-ES.
 */
function readCredential(value: unknown): ServiceCredential | Fault {
  if (!isRecord(value)) return new Fault('its shape');
  if (hasOtherMember(value, CREDENTIAL_MEMBERS))
    return new Fault('an unknown member');
  const { iss, resource, client_id, target } = value;
  if (value.v !== 1) return new Fault('v');
  if (!isServiceUrl(iss)) return new Fault('iss');
  if (!isServiceUrl(resource)) return new Fault('resource');
  if (!isId(client_id)) return new Fault('client_id');
  if (!isRecord(target)) return new Fault('target');
  if (hasOtherMember(target, TARGET_MEMBERS))
    return new Fault('an unknown member in target');
  const { kind, id } = target;
  if (!isTargetKind(kind)) return new Fault('target.kind');
  if (!isId(id)) return new Fault('target.id');
  const sig = readKey(value.sig, 'sig', 'ES256');
  if (sig instanceof Fault) return sig;
  const enc = readKey(value.enc, 'enc', 'ECDH-ES');
  if (enc instanceof Fault) return enc;
  return { v: 1, iss, resource, client_id, target: { kind, id }, sig, enc };
}

const NOT_A_CREDENTIAL = 'WALKEROS_CREDENTIAL is not a walkerOS credential';

// Core ships without TextEncoder (see batchedPoster.ts). The check keeps
// every member visible ASCII, so the JSON is ASCII and btoa/atob carry it
// byte for byte.
function toBase64Url(ascii: string): string {
  return btoa(ascii).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function fromBase64Url(text: string): string | undefined {
  if (!BASE64URL.test(text) || text.length % 4 === 1) return undefined;
  const pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
  let binary: string;
  try {
    binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + pad);
  } catch {
    return undefined;
  }
  for (let i = 0; i < binary.length; i++)
    if (binary.charCodeAt(i) > 0x7e) return undefined;
  return binary;
}

/** The credential string: the prefix and the base64url of its JSON. Throws when it does not fit the shape. */
export function encodeServiceCredential(credential: ServiceCredential): string {
  const read = readCredential(credential);
  if (read instanceof Fault)
    throw new Error(`${NOT_A_CREDENTIAL} (${read.at})`);
  return SERVICE_CREDENTIAL_PREFIX + toBase64Url(JSON.stringify(read));
}

/** The credential a string holds. Throws a fact that never carries the string or a key. */
export function decodeServiceCredential(raw: string): ServiceCredential {
  if (!raw.startsWith(SERVICE_CREDENTIAL_PREFIX))
    throw new Error(NOT_A_CREDENTIAL);
  const json = fromBase64Url(raw.slice(SERVICE_CREDENTIAL_PREFIX.length));
  if (json === undefined) throw new Error(NOT_A_CREDENTIAL);
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error(NOT_A_CREDENTIAL);
  }
  const read = readCredential(value);
  if (read instanceof Fault)
    throw new Error(`${NOT_A_CREDENTIAL} (${read.at})`);
  return read;
}

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

/** A token answer, or undefined; members it does not name are ignored (RFC 6749 section 5.1). */
export function parseServiceTokenResponse(
  value: unknown,
): ServiceTokenResponse | undefined {
  if (!isRecord(value)) return undefined;
  const { access_token, token_type, expires_in, scope } = value;
  if (typeof access_token !== 'string' || !VISIBLE_ASCII.test(access_token))
    return undefined;
  if (token_type !== 'DPoP' && token_type !== 'Bearer') return undefined;
  if (
    typeof expires_in !== 'number' ||
    !Number.isInteger(expires_in) ||
    expires_in <= 0
  )
    return undefined;
  if (typeof scope !== 'string') return undefined;
  return { access_token, token_type, expires_in, scope };
}

/** The metadata members a credential holder reads, or undefined; the others are ignored (RFC 8414 section 3.2). */
export function parseServiceAuthMetadata(
  value: unknown,
): ServiceAuthMetadata | undefined {
  if (!isRecord(value)) return undefined;
  const {
    issuer,
    service_token_endpoint,
    dpop_signing_alg_values_supported: algs,
  } = value;
  if (typeof issuer !== 'string' || typeof service_token_endpoint !== 'string')
    return undefined;
  if (!isStringList(algs)) return undefined;
  return {
    issuer,
    service_token_endpoint,
    dpop_signing_alg_values_supported: [...algs],
  };
}
