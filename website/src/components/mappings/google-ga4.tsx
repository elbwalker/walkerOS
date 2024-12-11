import type { Mapping, WalkerOS } from '@elbwalker/types';
import { createEvent } from '@elbwalker/utils';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';
import EventMapping from '../preview/eventMapping';
import { destinationPush } from './destination';
import { SourceWalkerjs } from '@elbwalker/walker.js';

interface MappingGA4Props {
  event: WalkerOS.PartialEvent;
  custom?: WalkerOS.AnyObject;
  mapping?: Mapping.Config;
}

const MappingGA4: React.FC<MappingGA4Props> = ({
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
    <EventMapping
      fnName="gtag"
      left={event}
      middle={mapping}
      mapping={mapping}
      fn={mappingFn}
    />
  );
};

export default MappingGA4;
