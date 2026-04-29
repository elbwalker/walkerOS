import type { WalkerOS } from '../types';

// Event v4: new shape compiles
const e: WalkerOS.Event = {
  name: 'page view',
  data: {},
  context: {},
  globals: {},
  custom: {},
  user: {},
  nested: [],
  consent: {},
  id: '0123456789abcdef',
  trigger: '',
  entity: 'page',
  action: 'view',
  timestamp: 0,
  timing: 0,
  source: { type: 'collector' },
};
void e;

// Source v4: new shape compiles
const collectorSrc: WalkerOS.Source = {
  type: 'collector',
  schema: '4',
};
void collectorSrc;

const browserSrc: WalkerOS.Source = {
  type: 'browser',
  platform: 'web',
  url: 'https://example.com/',
  referrer: 'https://google.com/',
  schema: '4',
};
void browserSrc;

// Entity v4: nested and context optional
const minimalEntity: WalkerOS.Entity = { entity: 'product', data: {} };
void minimalEntity;
