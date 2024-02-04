import type { WalkerOS } from '@elbwalker/types';
import type { StorageType } from '..';

const Commands: { [key: string]: WalkerOS.Commands } = {
  Action: 'action',
  Config: 'config',
  Consent: 'consent',
  Context: 'context',
  Destination: 'destination',
  Elb: 'elb',
  Globals: 'globals',
  Hook: 'hook',
  Init: 'init',
  Link: 'link',
  Prefix: 'data-elb',
  Run: 'run',
  User: 'user',
  Walker: 'walker',
} as const;

const UtilsStorage: { [key: string]: StorageType } = {
  Cookie: 'cookie',
  Local: 'local',
  Session: 'session',
} as const;

const Utils = {
  Storage: UtilsStorage,
};

export const Const = {
  Commands,
  Utils,
};

export default Const;
