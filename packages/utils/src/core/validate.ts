import type { Schema, WalkerOS } from '@elbwalker/types';
import { throwError } from './throwError';
import { isSameType } from './isSameType';
import { tryCatch } from './tryCatch';

export function validateEvent(
  obj: unknown,
  customContracts: Schema.Contracts = [],
): WalkerOS.Event | never {
  if (!isSameType(obj, {} as WalkerOS.AnyObject)) throwError('Invalid object');

  let event: string;
  let entity: string;
  let action: string;

  // Check if event.event is available and it's a string
  if (isSameType(obj.event, '')) {
    event = obj.event;
    [entity, action] = event.split(' ');
    if (!entity || !action) throwError('Invalid event name');
  } else if (isSameType(obj.entity, '') && isSameType(obj.action, '')) {
    entity = obj.entity;
    action = obj.action;
    event = `${entity} ${action}`;
  } else {
    throwError('Missing or invalid event, entity, or action');
  }

  const basicContract: Schema.Contract = {
    '*': {
      '*': {
        event: { maxLength: 255 }, // @TODO as general rule?
        user: { allowedKeys: ['id', 'device', 'session'] },
        consent: { allowedValues: [true, false] },
        timestamp: { min: 0 },
        timing: { min: 0 },
        count: { min: 0 },
        version: { allowedKeys: ['client', 'tagging'] },
        source: { allowedKeys: ['type', 'id', 'previous_id'] },
      },
    },
  };

  const basicEvent: WalkerOS.Event = {
    event,
    data: {},
    context: {},
    custom: {},
    globals: {},
    user: {},
    nested: [],
    consent: {},
    id: '',
    trigger: '',
    entity,
    action,
    timestamp: 0,
    timing: 0,
    group: '',
    count: 0,
    version: { client: '', tagging: 0 },
    source: { type: '', id: '', previous_id: '' },
  };

  // Collect all relevant schemas for the event
  const schemas = [basicContract]
    .concat(customContracts)
    .reduce((acc, contract) => {
      return ['*', entity].reduce((entityAcc, e) => {
        return ['*', action].reduce((actionAcc, a) => {
          const schema = contract[e]?.[a];
          return schema ? actionAcc.concat([schema]) : actionAcc;
        }, entityAcc);
      }, acc);
    }, [] as Schema.Properties[]);

  const result = schemas.reduce(
    (acc, schema) => {
      // Get all required properties
      const requiredKeys = Object.keys(schema).filter((key) => {
        const property = schema[key];
        return property?.required === true;
      });

      // Validate both, ingested and required properties but only once
      return [...Object.keys(obj), ...requiredKeys].reduce((acc, key) => {
        const propertySchema = schema[key];
        let value = obj[key];

        if (propertySchema) {
          // Update the value
          value = tryCatch(validateProperty, (err) => {
            throwError(String(err));
          })(acc, key, value, propertySchema);
        }

        // Same type check
        if (isSameType(value, acc[key])) acc[key] = value;

        return acc;
      }, acc);
    },
    // Not that beautiful but it works, narrowing down the type is tricky here
    // it's important that basicEvent is defined as an WalkerOS.Event
    basicEvent as unknown as WalkerOS.AnyObject,
  ) as unknown as WalkerOS.Event;

  // @TODO Final check for result.event === event.entity + ' ' + event.action

  return result;
}

export function validateProperty(
  obj: WalkerOS.AnyObject,
  key: string,
  value: unknown,
  schema: Schema.Property,
): WalkerOS.Property | never {
  // @TODO unknown to WalkerOS.Property

  // Note regarding potentially malicious values
  // Initial collection doesn't manipulate data
  // Prefer context-specific checks in the destinations

  // Custom validate function can change the value
  if (schema.validate)
    value = tryCatch(schema.validate, (err) => {
      throwError(String(err));
    })(value, key, obj);

  if (schema.required && value === undefined)
    throwError('Missing required property');

  // Strings
  if (isSameType(value, '' as string)) {
    if (schema.maxLength && value.length > schema.maxLength) {
      if (schema.strict) throwError('Value exceeds maxLength');
      value = value.substring(0, schema.maxLength);
    }
  }

  // Numbers
  else if (isSameType(value, 1 as number)) {
    if (isSameType(schema.min, 1) && value < schema.min) {
      if (schema.strict) throwError('Value below min');
      value = schema.min;
    } else if (isSameType(schema.max, 1) && value > schema.max) {
      if (schema.strict) throwError('Value exceeds max');
      value = schema.max;
    }
  }

  // @TODO boolean

  // Objects
  else if (isSameType(value, {} as WalkerOS.AnyObject)) {
    if (schema.schema) {
      const nestedSchema = schema.schema;

      // @TODO handle return to update value as non unknown
      // @TODO bug with multiple rules in property schema
      Object.keys(nestedSchema).reduce((acc, key) => {
        const propertySchema = nestedSchema[key];
        let value = acc[key];

        if (propertySchema) {
          // Type check
          if (propertySchema.type && typeof value !== propertySchema.type)
            throwError(`Type doesn't match (${key})`);

          // Update the value
          value = tryCatch(validateProperty, (err) => {
            throwError(String(err));
          })(acc, key, value, propertySchema);
        }

        return value as WalkerOS.AnyObject;
      }, value);
    }

    for (const objKey of Object.keys(value)) {
      // Check for allowed keys if applicable
      if (schema.allowedKeys && !schema.allowedKeys.includes(objKey)) {
        if (schema.strict) throwError('Key not allowed');

        delete value[objKey];
      }
    }
  }

  return value as WalkerOS.Property;
}
