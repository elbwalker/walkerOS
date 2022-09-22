import { Walker, WebDestination } from '.';

export namespace IElbwalker {
  type AnyObject = Record<string, unknown>;

  export interface Function {
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
    PushData?,
    string?,
    Walker.Entities?,
  ];
  type PushData = AnyObject | WebDestination.Function;

  interface Config {
    consent: Consent;
    prefix: string;
    pageview: boolean;
    custom?: boolean;
    elbLayer: ElbLayer;
    projectId?: string;
    version: number;
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

  interface Consent {
    [name: string]: boolean; // name of consent group or tool
  }

  interface Version {
    walker: number;
    config: number;
  }
}
