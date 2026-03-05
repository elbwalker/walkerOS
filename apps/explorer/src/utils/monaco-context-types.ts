/**
 * Monaco Editor Context Type Templates
 *
 * Hand-crafted global namespace declarations for function contexts.
 * These provide full TypeScript IntelliSense in Monaco Editor without
 * requiring import statements.
 *
 * Extracted from @walkeros/core types and simplified for editor use.
 */

/**
 * Type template for 'fn' context (transformation functions)
 *
 * Provides types for:
 * - value: WalkerOS.DeepPartialEvent | unknown
 * - mapping: Mapping.Value
 * - options: Mapping.Options
 */
export const FN_CONTEXT_TYPES = `
// WalkerOS Core Types
declare namespace WalkerOS {
  // Utility types
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };

  type PromiseOrValue<T> = T | Promise<T>;

  // Property types
  type PropertyType = boolean | string | number | {
    [key: string]: Property;
  };

  type Property = PropertyType | Array<PropertyType>;

  interface Properties {
    [key: string]: Property | undefined;
  }

  interface OrderedProperties {
    [key: string]: [Property, number] | undefined;
  }

  // Consent
  interface Consent {
    [name: string]: boolean;
  }

  // User
  interface User extends Properties {
    id?: string;
    device?: string;
    session?: string;
    hash?: string;
    address?: string;
    email?: string;
    phone?: string;
    userAgent?: string;
    browser?: string;
    browserVersion?: string;
    deviceType?: string;
    language?: string;
    country?: string;
    region?: string;
    city?: string;
    zip?: string;
    timezone?: string;
    os?: string;
    osVersion?: string;
    screenSize?: string;
    ip?: string;
    internal?: boolean;
  }

  // Version
  interface Version extends Properties {
    source: string;
    tagging: number;
  }

  // Source
  type SourceType = 'web' | 'server' | 'app' | 'other' | string;

  interface Source extends Properties {
    type: SourceType;
    id: string;
    previous_id: string;
  }

  // Entity
  type Entities = Array<Entity>;

  interface Entity {
    entity: string;
    data: Properties;
    nested: Entities;
    context: OrderedProperties;
  }

  // Event
  interface Event {
    name: string;
    data: Properties;
    context: OrderedProperties;
    globals: Properties;
    custom: Properties;
    user: User;
    nested: Entities;
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

  type DeepPartialEvent = DeepPartial<Event>;
}

// Mapping Types
declare namespace Mapping {
  type ValueType = string | ValueConfig;
  type Value = ValueType | Array<ValueType>;
  type Values = Array<Value>;

  interface ValueConfig {
    condition?: Condition;
    consent?: WalkerOS.Consent;
    fn?: Fn;
    key?: string;
    loop?: Loop;
    map?: Map;
    set?: Value[];
    validate?: Validate;
    value?: WalkerOS.PropertyType;
  }

  type Loop = [Value, Value];

  type Map = {
    [key: string]: Value;
  };

  interface Options {
    consent?: WalkerOS.Consent;
    collector?: Collector.Instance;
    props?: unknown;
  }

  type Condition = (
    value: WalkerOS.DeepPartialEvent | unknown,
    mapping?: Value,
    collector?: Collector.Instance
  ) => WalkerOS.PromiseOrValue<boolean>;

  type Fn = (
    value: WalkerOS.DeepPartialEvent | unknown,
    mapping: Value,
    options: Options
  ) => WalkerOS.PromiseOrValue<WalkerOS.Property | unknown>;

  type Validate = (value?: unknown) => WalkerOS.PromiseOrValue<boolean>;
}

// Collector Types (minimal for fn context)
declare namespace Collector {
  interface Instance {
    push: any;
    command: any;
    allowed: boolean;
    config: any;
    consent: WalkerOS.Consent;
    count: number;
    custom: WalkerOS.Properties;
    globals: WalkerOS.Properties;
    group: string;
    queue: any[];
    round: number;
    session: any;
    timing: number;
    user: WalkerOS.User;
    version: string;
    [key: string]: any;
  }
}

// Parameter declarations for fn context
declare const value: WalkerOS.DeepPartialEvent | unknown;
declare const mapping: Mapping.Value;
declare const options: Mapping.Options;
`;

/**
 * Type template for 'condition' context (conditional functions)
 *
 * Provides types for:
 * - value: WalkerOS.DeepPartialEvent | unknown
 * - mapping: Mapping.Value
 * - collector: Collector.Instance | undefined
 */
export const CONDITION_CONTEXT_TYPES = `
// WalkerOS Core Types
declare namespace WalkerOS {
  // Utility types
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };

  type PromiseOrValue<T> = T | Promise<T>;

  // Property types
  type PropertyType = boolean | string | number | {
    [key: string]: Property;
  };

  type Property = PropertyType | Array<PropertyType>;

  interface Properties {
    [key: string]: Property | undefined;
  }

  interface OrderedProperties {
    [key: string]: [Property, number] | undefined;
  }

  // Consent
  interface Consent {
    [name: string]: boolean;
  }

  // User
  interface User extends Properties {
    id?: string;
    device?: string;
    session?: string;
    hash?: string;
    address?: string;
    email?: string;
    phone?: string;
    userAgent?: string;
    browser?: string;
    browserVersion?: string;
    deviceType?: string;
    language?: string;
    country?: string;
    region?: string;
    city?: string;
    zip?: string;
    timezone?: string;
    os?: string;
    osVersion?: string;
    screenSize?: string;
    ip?: string;
    internal?: boolean;
  }

  // Version
  interface Version extends Properties {
    source: string;
    tagging: number;
  }

  // Source
  type SourceType = 'web' | 'server' | 'app' | 'other' | string;

  interface Source extends Properties {
    type: SourceType;
    id: string;
    previous_id: string;
  }

  // Entity
  type Entities = Array<Entity>;

  interface Entity {
    entity: string;
    data: Properties;
    nested: Entities;
    context: OrderedProperties;
  }

  // Event
  interface Event {
    name: string;
    data: Properties;
    context: OrderedProperties;
    globals: Properties;
    custom: Properties;
    user: User;
    nested: Entities;
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

  type DeepPartialEvent = DeepPartial<Event>;
}

// Mapping Types
declare namespace Mapping {
  type ValueType = string | ValueConfig;
  type Value = ValueType | Array<ValueType>;

  interface ValueConfig {
    condition?: Condition;
    consent?: WalkerOS.Consent;
    fn?: Fn;
    key?: string;
    loop?: Loop;
    map?: Map;
    set?: Value[];
    validate?: Validate;
    value?: WalkerOS.PropertyType;
  }

  type Loop = [Value, Value];

  type Map = {
    [key: string]: Value;
  };

  type Condition = (
    value: WalkerOS.DeepPartialEvent | unknown,
    mapping?: Value,
    collector?: Collector.Instance
  ) => WalkerOS.PromiseOrValue<boolean>;

  type Fn = (
    value: WalkerOS.DeepPartialEvent | unknown,
    mapping: Value,
    options: any
  ) => WalkerOS.PromiseOrValue<WalkerOS.Property | unknown>;

  type Validate = (value?: unknown) => WalkerOS.PromiseOrValue<boolean>;
}

// Collector Types (full interface for condition context)
declare namespace Collector {
  interface SessionData extends WalkerOS.Properties {
    isStart: boolean;
    storage: boolean;
    id?: string;
    start?: number;
    marketing?: true;
    updated?: number;
    isNew?: boolean;
    device?: string;
    count?: number;
    runs?: number;
  }

  interface Config {
    run?: boolean;
    tagging: number;
    globalsStatic: WalkerOS.Properties;
    sessionStatic: Partial<SessionData>;
    verbose: boolean;
    onError?: any;
    onLog?: any;
  }

  interface Instance {
    push: any;
    command: any;
    allowed: boolean;
    config: Config;
    consent: WalkerOS.Consent;
    count: number;
    custom: WalkerOS.Properties;
    sources: any;
    destinations: any;
    globals: WalkerOS.Properties;
    group: string;
    hooks: any;
    on: any;
    queue: any[];
    round: number;
    session: undefined | SessionData;
    timing: number;
    user: WalkerOS.User;
    version: string;
  }
}

// Parameter declarations for condition context
declare const value: WalkerOS.DeepPartialEvent | unknown;
declare const mapping: Mapping.Value;
declare const collector: Collector.Instance | undefined;
`;

/**
 * Type template for 'validate' context (validation functions)
 *
 * Provides types for:
 * - value: unknown
 */
export const VALIDATE_CONTEXT_TYPES = `
// Parameter declaration for validate context
declare const value: unknown;
`;

/**
 * Get the type template for a specific function context
 */
export function getContextTypes(
  contextType: 'fn' | 'condition' | 'validate',
): string {
  switch (contextType) {
    case 'fn':
      return FN_CONTEXT_TYPES;
    case 'condition':
      return CONDITION_CONTEXT_TYPES;
    case 'validate':
      return VALIDATE_CONTEXT_TYPES;
    default:
      return '';
  }
}
