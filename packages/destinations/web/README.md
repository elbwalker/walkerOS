# walkerOS web destinations

Understand the concept of destinations, learn how to use them, and how to write you own.

- [API](./api/)
- [Google Ads](./google-ads/)
- [Google GA4](./google-ga4/)
- [Google Tag Manager](./google-gtm/)
- [Meta Pixel (Facebook Pixel)](./meta-pixel/)
- [Piwik PRO](./piwikpro/)
- [Plausible](./plausible/)

Couldn't find what you were looking for? [Request a destination](https://github.com/elbwalker/walkerOS/issues/new).
If you want your destination to be added feel free to create an issue.

## 🤓 Write your own

A valid `WebDestination.Function` consists of a `config` object and a `push` method. In addition a `type` helps to specify the destination while the `init` function configures the environment by maybe loading additional scripts and setting required variables.

```ts
interface Function {
  config: Config<Custom, EventCustom>;
  type?: string;
  init?: (config: Config<Custom, EventCustom>) => boolean;
  push: (
    event: WalkerOS.Event,
    config: Config<Custom, EventCustom>,
    mapping?: EventConfig<EventCustom>,
    runState?: WalkerOS.Config,
  ) => void;
}
```

### Config

Set all necessary parameters and handle the states. It's separated to keep control of the destination once it's been added to the walker using `destination.config`.

### Push(event, config, mapping)

The default interface the walker uses to deliver events to each destination.

### Init

This function is optional. It has to return a boolean if initialization has worked out properly. As long as init doesn't return `true` no events will get pushed but each time an event occurs the walkerOS web client tries to init again.

The walker checks the `config.init` value to see if a destination has been initialized, or not. This way you can add a destination that has already been initialized.

## Final words

We highly recommend writing a corresponding test. We plan to enhance the `Config` continuously. To prevent overriding or naming conflicts use the `custom` object.

Feel free to [contribute](https://github.com/elbwalker/walkerOS#-contributing) you destinations.
