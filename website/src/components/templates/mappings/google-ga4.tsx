import { getEvent } from '@elbwalker/utils';
import {
  DestinationInit,
  DestinationPush,
} from '@site/src/components/organisms/liveDestination';
import { mapping } from '@elbwalker/destination-web-google-ga4/examples';

export const GoogleGA4Init: React.FC = () => {
  return (
    <DestinationInit
      custom={`{
  measurementId: 'G-XXXXXXXXXX', // Required
  debug: false,
  include: ['globals'],
  pageview: false,
  data: {
    map: {
      currency: {
        value: 'EUR',
        key: 'data.currency',
      },
    },
  },
  server_container_url: 'https://server.example.com',
  snakeCase: true,
  transport_url: 'https://www.google-analytics.com/g/collect',
}`}
    />
  );
};

export const GoogleGA4ProductAdd: React.FC = () => {
  return (
    <DestinationPush
      event={getEvent('product add')}
      mapping={mapping.add_to_cart}
    />
  );
};

export const GoogleGA4OrderComplete: React.FC = () => {
  return (
    <DestinationPush
      event={getEvent('order complete')}
      mapping={mapping.purchase}
    />
  );
};
