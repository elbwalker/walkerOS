import { IElbwalker, Utils, Walker } from '../types';

export const Commands: { [key: string]: IElbwalker.Commands } = {
  ['Action']: 'action',
  ['Config']: 'config',
  ['Consent']: 'consent',
  ['Context']: 'context',
  ['Destination']: 'destination',
  ['Elb']: 'elb',
  ['Globals']: 'globals',
  ['Hook']: 'hook',
  ['Init']: 'init',
  ['Link']: 'link',
  ['Prefix']: 'data-elb',
  ['Run']: 'run',
  ['User']: 'user',
  ['Walker']: 'walker',
} as const;

export const Trigger: { [key: string]: Walker.Trigger } = {
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

export const UtilsStorage: { [key: string]: Utils.Storage.Type } = {
  Cookie: 'cookie',
  Local: 'local',
  Session: 'session',
} as const;
