import type { WalkerOS } from '@walkeros/core';

export type PersonaKey = 'anonymous' | 'lisa' | 'sam';

/** A demo user: a key for `?user=`, a name to show and the user it tags. */
export interface Persona {
  key: PersonaKey;
  label: string;
  user?: WalkerOS.User;
}

const byKey: Record<PersonaKey, Persona> = {
  anonymous: { key: 'anonymous', label: 'Anonymous' },
  lisa: {
    key: 'lisa',
    label: 'Lisa Loyal',
    user: { id: 'lisa-loyal', email: 'lisa@example.com', segment: 'vip' },
  },
  // No `segment` key on purpose: `segment:undefined` would arrive as the
  // string "undefined".
  sam: {
    key: 'sam',
    label: 'Sam Sales',
    user: { id: 'sam-sales', email: 'sam@example.com' },
  },
};

export const personas: readonly Persona[] = Object.values(byKey);

export function personaFor(key: PersonaKey): Persona {
  return byKey[key];
}

export function isPersonaKey(value: unknown): value is PersonaKey {
  return personas.some((persona) => persona.key === value);
}

const param = 'user';

/** The persona a page's `?user=` names; unknown or missing: anonymous. */
export function personaFromSearch(search: string): PersonaKey {
  const value = new URLSearchParams(search).get(param);
  return isPersonaKey(value) ? value : 'anonymous';
}

/** The search for a persona: sets `?user=`, drops it for anonymous, keeps the rest. */
export function searchForPersona(search: string, key: PersonaKey): string {
  const params = new URLSearchParams(search);
  if (key === 'anonymous') params.delete(param);
  else params.set(param, key);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** The `data-elbuser` value: `key:value` pairs in the user's key order. */
export function userAttribute(user: WalkerOS.User): string {
  return Object.entries(user)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}
