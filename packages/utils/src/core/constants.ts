import type { Utils as TUtils, WalkerOS } from '@elbwalker/types';

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

const UtilsStorage: { [key: string]: TUtils.StorageType } = {
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
