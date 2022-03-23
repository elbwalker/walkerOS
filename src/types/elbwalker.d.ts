import { Destination } from './destination';
import { AnyObject } from './globals';
import { Walker } from './walker';

export declare namespace Elbwalker {
  interface Function {
    go: (projectId?: string) => void;
    load: () => void;
    run: () => void;
    push: (
      event: string,
      data?: AnyObject,
      trigger?: string,
      nested?: Walker.Entities,
    ) => void;
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
  }

  interface ElbLayer {
    push: (
      event?: string,
      data?: unknown,
      trigger?: string,
      nested?: Walker.Entities,
    ) => void;
  }

  interface User {
    id?: string;
    device?: string;
    hash?: string;
  }

  const enum Commands {
    Destination = 'destination',
    User = 'user',
    Walker = 'walker',
  }
}
