import { Walker } from './walker';
import { WebDestination } from './destinations';

export namespace Measurement {
  export interface Plan {
    version: number;
    sources: Sources;
    destinations: Destinations;
    owners: Owners;
  }

  interface Sources {
    [sourceId: string]: Source;
  }

  interface Source {
    name: string;
    type: SourceType;
    owners: Array<Owner>;
    entities: Entities;
    globals: Properties;
  }

  const enum SourceType {
    App = 'app',
    Other = 'other',
    Server = 'server',
    Web = 'web',
  }

  interface EntityIds {
    [entityId: string]: string;
  }

  interface ActionIds {
    [actionId: string]: string;
  }

  interface Entities {
    [entityId: string]: Entity;
  }

  interface Entity {
    name: string;
    description: string;
    actions: Actions;
    properties: Properties;
    owners: Array<Owner>;
  }

  interface Actions {
    [actionId: string]: Action;
  }

  interface Action {
    name: string;
    description: string;
    properties: Array<PropertyLink>;
    trigger: Walker.Trigger;
    type: ActionType;
  }

  const enum ActionType {
    Core = 'core',
    Basic = 'basic',
    UX = 'ux',
  }

  interface PropertyLink {
    propertyId: string;
    required: boolean;
  }

  interface Properties {
    [propertyId: string]: Property;
  }

  interface Property {
    name: string;
    type: PropertyType;
  }

  type PropertyType = string | number | boolean;

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
