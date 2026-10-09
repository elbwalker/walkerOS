import {
  personaFromSearch,
  personas,
  searchForPersona,
  userAttribute,
} from './personas';

test('persona users', () => {
  const byKey = Object.fromEntries(personas.map((p) => [p.key, p.user]));
  expect(byKey.anonymous).toBeUndefined();
  expect(userAttribute(byKey.lisa ?? {})).toBe(
    'id:lisa-loyal;email:lisa@example.com;segment:vip',
  );
  expect(userAttribute(byKey.sam ?? {})).toBe(
    'id:sam-sales;email:sam@example.com',
  );
  // A missing key, never `segment:undefined`, which arrives as a string.
  expect(byKey.sam && 'segment' in byKey.sam).toBe(false);
});

test('persona labels', () => {
  expect(personas.map((p) => p.label)).toEqual([
    'Anonymous',
    'Lisa Loyal',
    'Sam Sales',
  ]);
});

test('search round trip', () => {
  expect(personaFromSearch('')).toBe('anonymous');
  expect(personaFromSearch('?user=lisa')).toBe('lisa');
  expect(personaFromSearch('?user=nobody')).toBe('anonymous');
  expect(searchForPersona('?a=1', 'sam')).toBe('?a=1&user=sam');
  expect(searchForPersona('?a=1&user=sam', 'anonymous')).toBe('?a=1');
  expect(searchForPersona('?user=sam', 'anonymous')).toBe('');
  expect(searchForPersona('', 'lisa')).toBe('?user=lisa');
});
