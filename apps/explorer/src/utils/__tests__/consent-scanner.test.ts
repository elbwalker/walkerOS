import { scanMappingForConsentStates } from '../consent-scanner';
import type { Mapping } from '@walkeros/core';

describe('scanMappingForConsentStates', () => {
  it('finds consent states at rule level', () => {
    const config: Mapping.Rules = {
      page: {
        view: {
          name: 'page_view',
          consent: { analytics: true, functional: true },
        },
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual(['analytics', 'functional']);
  });

  it('finds consent states in deeply nested ValueConfig', () => {
    const config: Mapping.Rules = {
      page: {
        view: {
          name: 'page_view',
          data: {
            map: {
              page_location: {
                key: 'data.location',
                consent: { marketing: true },
              },
              user_email: {
                key: 'user.email',
                consent: { marketing: true, personalization: true },
              },
            },
          },
        },
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual(['marketing', 'personalization']);
  });

  it('finds consent states at multiple levels', () => {
    const config: Mapping.Rules = {
      page: {
        view: {
          name: 'page_view',
          consent: { functional: true }, // Rule level
          data: {
            map: {
              page_location: {
                key: 'data.location',
                consent: { marketing: true }, // ValueConfig level
              },
            },
          },
        },
      },
      order: {
        complete: {
          name: 'purchase',
          consent: { analytics: true }, // Another rule level
        },
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual(['analytics', 'functional', 'marketing']);
  });

  it('finds consent states in nested map structures', () => {
    const config: Mapping.Rules = {
      product: {
        view: {
          name: 'view_item',
          data: {
            map: {
              items: {
                loop: [
                  'nested',
                  {
                    map: {
                      item_id: {
                        key: 'data.id',
                        consent: { advertising: true },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual(['advertising']);
  });

  it('finds consent states in set arrays', () => {
    const config: Mapping.Rules = {
      user: {
        login: {
          name: 'login',
          data: {
            set: [
              {
                map: {
                  email: {
                    key: 'user.email',
                    consent: { crm: true },
                  },
                },
              },
            ],
          },
        },
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual(['crm']);
  });

  it('deduplicates consent states', () => {
    const config: Mapping.Rules = {
      page: {
        view: {
          name: 'page_view',
          consent: { marketing: true },
          data: {
            map: {
              location: {
                key: 'data.location',
                consent: { marketing: true }, // Duplicate
              },
            },
          },
        },
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual(['marketing']); // Should appear only once
  });

  it('returns empty array when no consent states exist', () => {
    const config: Mapping.Rules = {
      page: {
        view: {
          name: 'page_view',
          data: {
            map: {
              title: 'data.title',
            },
          },
        },
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual([]);
  });

  it('handles array of rules', () => {
    const config: Mapping.Rules = {
      order: {
        complete: [
          {
            name: 'high_value_purchase',
            consent: { analytics: true },
          },
          {
            name: 'purchase',
            consent: { marketing: true },
          },
        ],
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual(['analytics', 'marketing']);
  });

  it('sorts consent states alphabetically', () => {
    const config: Mapping.Rules = {
      page: {
        view: {
          name: 'page_view',
          consent: { zebra: true, apple: true, marketing: true },
        },
      },
    };

    const states = scanMappingForConsentStates(config);
    expect(states).toEqual(['apple', 'marketing', 'zebra']);
  });
});
