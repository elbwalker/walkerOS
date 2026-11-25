import type { HashedUserData, Normalizer } from '../hashUserData';
import { hashUserData } from '../hashUserData';

const normalizers: Record<string, Normalizer> = {
  em: (value) => value.trim().toLowerCase(),
  ph: (value) => value.replace(/\D/g, ''),
};

// sha256 of 'user@example.com', 'jane@example.com' and '491701234567'
const user = 'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514';
const jane = '8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d';
const phone =
  '8b47a52ed04d068c3a9c5632b98cec18780a9f9f4099d4f8afe233970ce116fe';

describe('hashUserData', () => {
  it.each<[string, object, string[], string[], HashedUserData]>([
    [
      'normalizes and hashes a key with a normalizer',
      { em: ' User@Example.com ' },
      [],
      [],
      { userData: { em: user }, dropped: [] },
    ],
    [
      'hashes a number as a string',
      { ph: 491701234567 },
      [],
      [],
      { userData: { ph: phone }, dropped: [] },
    ],
    [
      'hashes a list item by item and keeps it a list',
      { em: ['user@example.com', ' JANE@example.com'] },
      [],
      [],
      { userData: { em: [user, jane] }, dropped: [] },
    ],
    [
      'sends a key without a normalizer as mapped',
      { client_ip_address: ' 192.0.2.1 ', fbc: ['fb.1.X'] },
      [],
      [],
      {
        userData: { client_ip_address: ' 192.0.2.1 ', fbc: ['fb.1.X'] },
        dropped: [],
      },
    ],
    [
      'sends a doNotHash key as mapped',
      { em: user.toUpperCase(), ph: '+49 170 1234567' },
      ['em'],
      [],
      { userData: { em: user.toUpperCase(), ph: phone }, dropped: [] },
    ],
    [
      'leaves out undefined, null and empty values under hashed keys',
      { em: '', ph: null },
      [],
      [],
      { userData: {}, dropped: [] },
    ],
    [
      'sends empty values under keys without a normalizer as mapped',
      { client_ip_address: '', fbp: null },
      [],
      [],
      { userData: { client_ip_address: '', fbp: null }, dropped: [] },
    ],
    [
      'leaves out an empty value under a doNotHash key',
      { em: '', ph: null },
      ['em', 'ph'],
      [],
      { userData: {}, dropped: [] },
    ],
    [
      'leaves out a value that normalizes to nothing',
      { em: '   ', ph: '+--' },
      [],
      [],
      { userData: {}, dropped: [] },
    ],
    [
      'leaves out empty list items, and a list with none left',
      { em: ['', null, ' ', 'user@example.com'], ph: [''] },
      [],
      [],
      { userData: { em: [user] }, dropped: [] },
    ],
    [
      'leaves out and returns a list under a key that takes one value',
      { em: ['user@example.com'], ph: '491701234567', fbc: ['fb.1.X'] },
      ['em'],
      ['em', 'ph', 'fbc'],
      { userData: { ph: phone }, dropped: ['em', 'fbc'] },
    ],
    [
      'looks normalizers up by own property only',
      { constructor: 'value', toString: 'value' },
      [],
      [],
      { userData: { constructor: 'value', toString: 'value' }, dropped: [] },
    ],
  ])('%s', async (_, userData, doNotHash, oneValue, expected) => {
    expect(
      await hashUserData(userData, normalizers, doNotHash, oneValue),
    ).toEqual(expected);
  });
});
