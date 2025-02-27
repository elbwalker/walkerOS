import type { Mapping } from '@elbwalker/types';
import { getEvent, isObject } from '@elbwalker/utils';
import { DestinationPush } from '../destination';

const event = getEvent('order complete');

export const destination = {
  push: (event, config, mapping, options) => {
    return config.fn(options.data);
  },
};

const string: Mapping.Data = 'data.total';
export const DataString: React.FC = () => {
  return (
    <DestinationPush event={{ data: event.data }} mapping={{ data: string }} />
  );
};

const key: Mapping.Data = { key: 'data.id' };
export const DataKey: React.FC = () => {
  return (
    <DestinationPush event={{ data: event.data }} mapping={{ data: key }} />
  );
};

const map: Mapping.Data = {
  map: {
    pageGroup: 'globals.pagegroup',
    shoppingStage: 'context.shopping.0',
  },
};
export const DataMap: React.FC = () => {
  return (
    <DestinationPush
      event={{ globals: event.globals, context: event.context }}
      mapping={{ data: map }}
    />
  );
};

const set: Mapping.Data = {
  set: ['trigger', 'entity', 'action'],
};
export const DataSet: React.FC = () => {
  return (
    <DestinationPush
      event={{
        trigger: event.trigger,
        entity: event.entity,
        action: event.action,
      }}
      mapping={{ data: set }}
    />
  );
};

const loop: Mapping.Data = { loop: ['nested', 'data.name'] };
export const DataLoop: React.FC = () => {
  return (
    <DestinationPush
      event={{ nested: event.nested }}
      mapping={{ data: loop }}
    />
  );
};

const condition: Mapping.Data = [
  {
    condition: (event) => isObject(event) && event.event === 'order complete',
    value: 'first',
  },
  {
    value: 'second',
  },
];

export const DataCondition: React.FC = () => {
  return (
    <DestinationPush
      event={{ event: event.event }}
      mapping={{ data: condition }}
    />
  );
};

const consent: Mapping.Data = {
  consent: {
    // functional: true,
    marketing: true,
  },
  key: 'data.id',
  value: 'redacted',
};
export const DataConsent: React.FC = () => {
  return (
    <DestinationPush
      event={{ consent: { marketing: true }, data: event.data }}
      mapping={{ data: consent }}
    />
  );
};

const fn = {
  fn: (event) => {
    console.log('🚀 ~ event:', isObject(event), event);
    return 123;
  },
} as unknown as Mapping.Data;

export const DataFn: React.FC = () => {
  return (
    <DestinationPush event={{ data: event.data }} mapping={{ data: fn }} />
  );
};

export const DataComplete: React.FC = () => {
  return (
    <DestinationPush
      event={event}
      mapping={{
        data: {
          map: {
            string,
            key,
            map,
            set,
          },
        },
      }}
    />
  );
};
