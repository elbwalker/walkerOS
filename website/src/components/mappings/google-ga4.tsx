import type { Mapping, WalkerOS } from '@elbwalker/types';
import { createEvent } from '@elbwalker/utils';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';
import EventMapping from '../preview/eventMapping';
import { destinationPush } from './destination';
import { SourceWalkerjs } from '@elbwalker/walker.js';

export const MappingGA4Init: React.FC<MappingGA4Props> = ({ custom = {} }) => {
  const mappingFn = (
    left: never,
    middle: never,
    log: (...args: unknown[]) => void,
  ) => {
    try {
      destinationGoogleGA4.init(
        {
          custom: left,
          fn: log,
        },
        {} as unknown as SourceWalkerjs.Instance,
      );
    } catch (error) {
      log(`Error mappingFn: ${error}`);
    }
  };

  return (
    <EventMapping
      fnName="gtag"
      fn={mappingFn}
      left={custom}
      labelLeft="Custom Config"
      showMiddle={false}
    />
  );
};

interface MappingGA4Props {
  event: WalkerOS.PartialEvent;
  custom?: WalkerOS.AnyObject;
  mapping?: Mapping.Config;
}

export const MappingGA4: React.FC<MappingGA4Props> = ({
  event,
  custom = {},
  mapping = {},
}) => {
  const mappingFn = (
    left: unknown,
    middle: never,
    log: (...args: unknown[]) => void,
  ) => {
    try {
      const event = createEvent(left);
      const [entity, action] = event.event.split(' ');
      const mapping = { [entity]: { [action]: middle } };

      destinationPush(
        { hooks: {} } as unknown as SourceWalkerjs.Instance,
        {
          ...destinationGoogleGA4,
          config: {
            custom,
            fn: log,
            mapping,
          },
        },
        event,
      );
    } catch (error) {
      log(`Error mappingFn: ${error}`);
    }
  };

  return (
    <EventMapping fnName="gtag" left={event} middle={mapping} fn={mappingFn} />
  );
};
