import type { Collector } from '@walkeros/core';
import type { WalkerOS } from '@walkeros/core';

export type CommandTypes =
  | 'Action'
  | 'Actions'
  | 'Config'
  | 'Consent'
  | 'Context'
  | 'Custom'
  | 'Destination'
  | 'Elb'
  | 'Globals'
  | 'Hook'
  | 'Init'
  | 'Link'
  | 'On'
  | 'Prefix'
  | 'Ready'
  | 'Run'
  | 'Session'
  | 'User'
  | 'Walker';

export const Commands: Record<CommandTypes, Collector.CommandType> = {
  Action: 'action',
  Actions: 'actions',
  Config: 'config',
  Consent: 'consent',
  Context: 'context',
  Custom: 'custom',
  Destination: 'destination',
  Elb: 'elb',
  Globals: 'globals',
  Hook: 'hook',
  Init: 'init',
  Link: 'link',
  On: 'on',
  Prefix: 'data-elb',
  Ready: 'ready',
  Run: 'run',
  Session: 'session',
  User: 'user',
  Walker: 'walker',
} as const;

export type StorageType = 'cookie' | 'local' | 'session';

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
