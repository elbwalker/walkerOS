import { createSign } from 'node:crypto';
import type { ServiceAccountCredentials } from './types';

export type TokenProvider = () => Promise<string>;

const METADATA_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/devstorage.read_write';
const REFRESH_MARGIN_MS = 60_000;

interface CachedToken {
  token: string;
  expiresAt: number;
}

export function createTokenProvider(
  credentials?: ServiceAccountCredentials,
): TokenProvider {
  let cached: CachedToken | undefined;

  return async function getToken(): Promise<string> {
    if (cached && Date.now() < cached.expiresAt) return cached.token;

    cached = credentials
      ? await fetchServiceAccountToken(credentials)
      : await fetchMetadataToken();

    return cached.token;
  };
}

async function fetchMetadataToken(): Promise<CachedToken> {
  const res = await fetch(METADATA_URL, {
    headers: { 'Metadata-Flavor': 'Google' },
  });
  if (!res.ok) throw new Error(`Metadata server error: ${res.status}`);

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  return {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - REFRESH_MARGIN_MS,
  };
}

async function fetchServiceAccountToken(
  creds: ServiceAccountCredentials,
): Promise<CachedToken> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwt(
    {
      iss: creds.client_email,
      scope: SCOPE,
      aud: OAUTH_URL,
      iat: now,
      exp: now + 3600,
    },
    creds.private_key,
  );

  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Token exchange error: ${res.status}`);

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  return {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - REFRESH_MARGIN_MS,
  };
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function signJwt(payload: object, privateKey: string): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${body}`);
  return `${header}.${body}.${sign.sign(privateKey, 'base64url')}`;
}
