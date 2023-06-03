import { Utils, Walker, WebDestination } from '.';

export namespace IElbwalker {
  type AnyObject = Record<string, unknown>;

  export interface Function {
    push: Elb;
    config: Config;
  }

  interface Elb {
    (event: 'walker config', config: Partial<Config>): void;
    (event: 'walker consent', consent: Consent): void;
    (
      event: 'walker destination',
      destination: WebDestination.Function<any, any>,
      config?: WebDestination.Config,
    ): void;
    (event: 'walker hook', name: string, hookFn: Utils.HookFn): void;
    (event: 'walker init', scope: Scope | Scope[]): void;
    (event: 'walker run'): void;
    (event: 'walker user', user: User): void;
    (
      event: string,
      data?: PushData,
      options?: PushOptions,
      context?: PushContext,
      nested?: Walker.Entities,
    ): void;
  }

  type ElbLayer = [
    (IArguments | string)?,
    PushData?,
    PushOptions?,
    Walker.OrderedProperties?,
    Walker.Entities?,
  ];

  type PushData =
    | Partial<Config>
    | Consent
    | Element
    | Scope
    | Scope[]
    | String
    | User
    | Walker.Properties
    | WebDestination.Function;

  type PushOptions = string | Utils.HookFn | WebDestination.Config; // @TODO use Walker.Trigger
  type PushContext = Walker.OrderedProperties | Element;

  type Scope = Document | HTMLElement;

  interface Config {
    allowed: boolean;
    consent: Consent;
    count: number;
    // @TODO custom state support
    elbLayer: ElbLayer;
    globals: Walker.Properties;
    group: string;
    hooks: Hooks<Utils.HookFn>;
    pageview: boolean;
    prefix: string;
    queue: IElbwalker.Event[];
    round: number;
    timing: number;
    user: User;
    version: number;
    default?: boolean;
  }

  type Events = Event[];
  interface Event {
    event: string;
    data: Walker.Properties;
    context: Walker.OrderedProperties;
    globals: Walker.Properties;
    user: User;
    nested: Walker.Entities;
    consent: Consent;
    id: string;
    trigger: string;
    entity: string;
    action: string;
    timestamp: number;
    timing: number;
    group: string;
    count: number;
    version: Version;
    source: Source;
  }

  interface User {
    id?: string;
    device?: string;
    session?: string;
  }

  const enum Commands {
    Action = 'action',
    Config = 'config',
    Consent = 'consent',
    Context = 'context',
    Destination = 'destination',
    Elb = 'elb',
    Globals = 'globals',
    Hook = 'hook',
    Init = 'init',
    Prefix = 'data-elb',
    Run = 'run',
    User = 'user',
    Walker = 'walker',
  }

  interface Consent {
    [name: string]: boolean; // name of consent group or tool
  }

  type Hooks<T extends (...args: unknown[]) => unknown> = {
    [key: string]: T;
  };

  interface Version {
    walker: number;
    config: number;
  }

  interface Source {
    type: SourceType;
    id: string; // https://github.com/elbwalker/walker.js
    previous_id: string; // https://www.elbwalker.com/
  }

  const enum SourceType {
    Web = 1,
    Server = 2,
    App = 3,
    Other = 4,
  }
}
