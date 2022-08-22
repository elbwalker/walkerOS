import { WebDestination } from './destinations';
import { AnyObject } from './globals';
import { Walker } from './walker';

export declare namespace Elbwalker {
  interface Function {
    go: (config?: Partial<Config>) => void;
    push: (
      event?: IArguments | unknown,
      data?: PushData,
      trigger?: string,
      nested?: Walker.Entities,
    ) => void;
    config: Config;
  }

  type ElbLayer = [
    (IArguments | unknown)?,
    Elbwalker.PushData?,
    string?,
    Walker.Entities?,
  ];
  type PushData = AnyObject | WebDestination.Function;

  interface Config {
    prefix: string;
    custom?: boolean;
    projectId?: string;
    version?: number;
  }

  type Events = Event[];
  interface Event {
    event: string;
    data: AnyObject;
    globals: AnyObject;
    user: User;
    nested: Walker.Entities;
    id: string;
    trigger: string;
    entity: string;
    action: string;
    timestamp: number;
    timing: number;
    group: string;
    count: number;
    version: Version;
  }

  interface User {
    id?: string;
    device?: string;
    hash?: string;
  }

  const enum Commands {
    Action = 'action',
    Config = 'config',
    Consent = 'consent',
    Destination = 'destination',
    Elb = 'elb',
    Globals = 'globals',
    Prefix = 'data-elb',
    Run = 'run',
    User = 'user',
    Walker = 'walker',
  }

  interface Version {
    walker: number;
    config: number;
  }
}
