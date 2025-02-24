import { getEvent } from '@elbwalker/utils';
import { DestinationPush } from '../destination';

const event = getEvent('order complete');

export const destination = {
  push: (event, config, mapping, options) => {
    return config.fn(options.data);
  },
};

const string = 'data.total';

const key = {
  key: 'data.id',
};

const map = {
  map: {
    pageGroup: 'globals.pagegroup',
    shoppingStage: 'context.shopping.0',
  },
};

const set = {
  set: ['trigger', 'entity', 'action'],
};

export const DataString: React.FC = () => {
  return (
    <DestinationPush event={{ data: event.data }} mapping={{ data: string }} />
  );
};

export const DataKey: React.FC = () => {
  return (
    <DestinationPush event={{ data: event.data }} mapping={{ data: key }} />
  );
};

export const DataMap: React.FC = () => {
  return (
    <DestinationPush
      event={{ globals: event.globals, context: event.context }}
      mapping={{ data: map }}
    />
  );
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
