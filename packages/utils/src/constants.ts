import type { Elbwalker, Utils as TUtils, Walker } from '@elbwalker/types';

const Commands: { [key: string]: Elbwalker.Commands } = {
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

const Trigger: { [key: string]: Walker.Trigger } = {
  Click: 'click',
  Custom: 'custom',
  Hover: 'hover',
  Load: 'load',
  Pulse: 'pulse',
  Scroll: 'scroll',
  Submit: 'submit',
  Visible: 'visible',
  Wait: 'wait',
} as const;

const UtilsStorage: { [key: string]: TUtils.StorageType } = {
  Cookie: 'cookie',
  Local: 'local',
  Session: 'session',
} as const;

const Utils = {
  Storage: UtilsStorage,
};

export default { Commands, Trigger, Utils };
