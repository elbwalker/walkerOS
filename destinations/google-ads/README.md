# Google Ads web destination for walker.js

Made to be used with [@elbwalker/walker.js](https://github.com/elbwalker/walker.js).

More detailed information and examples can be found in the [documentation](https://docs.elbwalker.com/).

## 🤓 Usage

Start by installing the destination with npm:

```sh
npm i --save @elbwalker/destination-web-google-ads
```

Import, configure and add the destination

```ts
import { elb } from '@elbwalker/walker.js';
import destinationAds, {
  DestinationAds, // Types
} from '@elbwalker/destination-web-google-ads';

const configAds: DestinationAds.Config = {
  // consent: { marketing: true }, // Neccessary consent states
  custom: {
    conversionId: 'abc', // The ads accounts id used for every conversion
    // currency: 'EUR', // Default currency is EUR
    // defaultValue: 1, // Used default value for conversions
  },
  // init: false, // Status if the destination was initialized successfully or should be skipped
  // loadScript: true, // Load additional required scripts on init
  mapping: {
    // order: {
    //   complete: {
    //     id: 'order_id', // Name of data property key to use as transaction id
    //     label: 'abc', // Conversion label
    //     value: 'revenue', // Name of data property key to use for value
    //   },
    // },
  },
};

// And add the destination to the walker.js
destinationAds.config = configAds;
elb('walker destination', destinationAds);
```

## Contribute

Feel free to contribute by submitting an [issue](https://github.com/elbwalker/walker.js/issues), starting a [discussion](https://github.com/elbwalker/walker.js/discussions) or getting in [contact](https://calendly.com/elb-alexander/30min).
