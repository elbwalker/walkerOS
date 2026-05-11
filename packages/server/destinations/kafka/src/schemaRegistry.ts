// schemaRegistry.ts
import type { Logger } from '@walkeros/core';
import type { SchemaRegistrySetup } from './types';

/**
 * Register a schema with a Confluent-compatible Schema Registry.
 *
 * Idempotent:
 * - POST returns 2xx on first registration.
 * - POST returns 409 if a compatible version already exists; treated as
 *   success (idempotent re-runs).
 *
 * If `compatibility` is set, sets the per-subject compatibility level via
 * PUT /config/<subject>.
 */
export async function registerSchema(
  options: SchemaRegistrySetup,
  logger: Logger.Instance,
): Promise<boolean> {
  const { url, subject, schema, schemaType, compatibility, auth } = options;
  const base = url.replace(/\/$/, '');
  const headers = buildHeaders(auth);

  const postUrl = `${base}/subjects/${encodeURIComponent(subject)}/versions`;
  const postRes = await fetch(postUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/vnd.schemaregistry.v1+json',
    },
    body: JSON.stringify({ schema, schemaType }),
  });

  if (postRes.status === 409) {
    logger.debug('setup: schema already registered (409)', { subject });
  } else if (!postRes.ok) {
    const text = await postRes.text();
    throw new Error(
      `Schema Registry POST failed: ${postRes.status} ${postRes.statusText} ${text}`,
    );
  } else {
    logger.info('setup: schema registered', { subject });
  }

  if (compatibility) {
    const putUrl = `${base}/config/${encodeURIComponent(subject)}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/vnd.schemaregistry.v1+json',
      },
      body: JSON.stringify({ compatibility }),
    });
    if (!putRes.ok) {
      const text = await putRes.text();
      throw new Error(
        `Schema Registry PUT /config failed: ${putRes.status} ${putRes.statusText} ${text}`,
      );
    }
    logger.info('setup: compatibility set', { subject, compatibility });
  }

  return true;
}

function buildHeaders(
  auth: SchemaRegistrySetup['auth'],
): Record<string, string> {
  if (!auth) return {};
  const token = Buffer.from(`${auth.username}:${auth.password}`).toString(
    'base64',
  );
  return { Authorization: `Basic ${token}` };
}
