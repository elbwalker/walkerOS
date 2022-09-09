import { Walker } from './walker';

export namespace Measurement {
  export interface Plan {
    entities: Entities;
    sources: Sources;
    destinations: Destinations;
    globals: Properties;
    version: string;
    users: Users;
  }

  interface Entities {
    [entityId: string]: Entity;
  }

  interface Entity {
    name: string;
    description: string;
    actions: Actions;
    properties: Properties;
    owner: User;
  }

  interface Actions {
    [actionId: string]: Action;
  }

  interface Action {
    name: string;
    consent: ConsentList;
    description: string;
    properties: PropertyLink;
    sources: ActionSources;
    trigger: Trigger;
    type: ActionType;
  }
  type ActionType = 'core' | 'additional';

  interface ActionSources {
    [sourceId: string]: SourceLink;
  }

  type ConsentList = Array<ConsentId>;
  type ConsentId = string;

  interface Consent {
    id: ConsentId;
    name: string;
  }

  interface SourceLink {
    required: boolean;
  }

  interface PropertyLink {
    id: string;
    required: boolean;
  }

  interface Properties {
    [propertyId: string]: Property;
  }

  interface Property {
    name: string;
    type: PropertyType;
    consent: ConsentList;
    example: string; // @TODO corresponding to type
  }

  type PropertyType = string | number | boolean;

  interface Trigger {
    type: TriggerType;
  }

  type TriggerType = Walker.Trigger;

  interface Sources {
    [sourceId: string]: Source;
  }

  interface Source {
    name: string;
    type: SourceType;
    owner: User;
  }

  type SourceType = 'app' | 'other' | 'server' | 'web';

  interface Destinations {
    [destinationId: string]: Destination;
  }

  interface Destination {
    name: string;
    type: DestinationType;
    owner: User;
  }

  type DestinationType =
    | 'event-pipe'
    | 'google-ga4'
    | 'google-gtm'
    | 'plausible'
    | 'custom';

  interface Users {
    [userId: string]: User;
  }

  interface User {
    name: string;
  }
}
