import type { Hooks, Walker, WebDestination } from '.';

export namespace IElbwalker {
  type AnyObject = Record<string, unknown>;

  interface Function {
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
    <K extends keyof Hooks.Functions>(
      event: 'walker hook',
      name: K,
      hookFn: Hooks.Functions[K],
    ): void;
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

  type PushOptions = string | Hooks.Functions | WebDestination.Config; // @TODO use Walker.Trigger
  type PushContext = Walker.OrderedProperties | Element;

  type Scope = Document | HTMLElement;

  interface Config {
    allowed: boolean;
    consent: Consent;
    count: number;
    destinations: Destinations;
    // @TODO custom state support
    elbLayer: ElbLayer;
    globals: Walker.Properties;
    group: string;
    hooks: Hooks.Functions;
    pageview: boolean;
    prefix: string;
    queue: Events;
    round: number;
    timing: number;
    user: User;
    version: number;
    default?: boolean;
  }

  interface Destinations {
    [name: string]: WebDestination.Function;
  }

  type Events = Array<Event>;
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

  interface Consent {
    [name: string]: boolean; // name of consent group or tool
  }

  interface Version {
    walker: number;
    config: number;
  }

  interface Source {
    type: SourceType;
    id: string; // https://github.com/elbwalker/walker.js
    previous_id: string; // https://www.elbwalker.com/
  }

  type Commands =
    | 'action'
    | 'config'
    | 'consent'
    | 'context'
    | 'destination'
    | 'elb'
    | 'globals'
    | 'hook'
    | 'init'
    | 'link'
    | 'data-elb'
    | 'run'
    | 'user'
    | 'walker'
    | string;

  type SourceType = 'web' | 'app' | 'server' | 'other' | string;
}
