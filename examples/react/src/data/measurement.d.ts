import { WebDestination } from '@elbwalker/walker.js';

export namespace Measurement {
  export interface Plan {
    version: number;
    name: string;
    owners: Array<Owner>;
    entities: Entities;
    globals: Properties;
    destinations: Destinations;
    owners: Owners;
  }

  interface Entities {
    [entityId: string]: Entity;
  }

  interface Entity {
    name: string;
    actions: Actions;
    properties: Properties;
    owners: Array<Owner>;
  }

  interface Actions {
    [actionId: string]: Action;
  }

  interface Action {
    name: string;
    properties: Array<string>;
    trigger: Trigger;
    type: ActionType;
  }

  export enum Trigger {
    Click = 'click',
    Hover = 'hover',
    Load = 'load',
    Pulse = 'pulse',
    Submit = 'submit',
    Visible = 'visible',
    Wait = 'wait',
  }

  export enum ActionType {
    Core = 'core',
    Basic = 'basic',
    UX = 'ux',
  }

  interface Properties {
    [propertyId: string]: Property;
  }

  interface Property {
    name: string;
    type: PropertyType;
  }

  export enum PropertyType {
    Text = 'string',
    Number = 'number',
    Boolean = 'boolean',
  }

  interface Destinations {
    [destinationId: string]: Destination;
  }

  interface Destination {
    name: string;
    type: DestinationType;
    owners: Array<Owner>;
    config: WebDestination.Config;
  }

  type DestinationType =
    | 'event-pipe'
    | 'google-ga4'
    | 'google-gtm'
    | 'plausible'
    | 'custom';

  interface Owners {
    [ownerId: string]: Owner;
  }

  interface Owner {
    name: string;
  }
}
