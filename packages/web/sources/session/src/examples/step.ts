import type { Flow } from '@walkeros/core';

export const sessionStart: Flow.StepExample = {
  in: {
    storage: true,
    consent: 'functional',
  },
  out: {
    name: 'session start',
    data: {
      id: 's3ss10n-id',
      start: 1700000000000,
      isNew: true,
      count: 1,
      runs: 1,
      isStart: true,
      storage: true,
    },
    entity: 'session',
    action: 'start',
  },
};

export const sessionResume: Flow.StepExample = {
  in: {
    storage: true,
    consent: 'functional',
  },
  out: {
    name: 'session start',
    data: {
      id: 's3ss10n-id',
      start: 1700000000000,
      isNew: false,
      count: 3,
      runs: 5,
      isStart: true,
      storage: true,
    },
    entity: 'session',
    action: 'start',
  },
};
