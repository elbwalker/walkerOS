# walker.js destinations

Understand the concept of destinations, learn how to use them, and how to write you own.

- [API](./api/)
- [event pipe](./event-pipe/)
- [Google Ads](./google-ads/)
- [Google GA4](./google-ga4/)
- [Google Tag Manager](./google-gtm/)
- [Meta Pixel (Facebook Pixel)](./meta-pixel/)
- [Plausible](./plausible/)

Couldn't find what you were looking for? [Request a destination](https://github.com/elbwalker/walker.js/issues/new).
If you want your destination to be added feel free to create an issue.

## 🤓 Write your own

Creating your own destinations is easy. Use [XXX Boilerplate](./xxx_boilerplate/) to get started. A valid `WebDestination.Function` consists of a `config` object, and the two methods:

```ts
interface Function {
  init?: (config: Config) => boolean;
  push: (
    event: IElbwalker.Event,
    config?: Config,
    mapping?: EventConfig,
  ) => void;
  config: Config;
}
```

### Config

Set all necessary parameters and handle the states. It's separated to keep control of the destination once it's been added to the walker using `destination.config`.

### Push(event)

The default interface the walker uses to deliver events to each destination.

### Init

This function is optional. It has to return a boolean if initialization has worked out properly. As long as init doesn't return `true` no events will get pushed but each time an event occurs walker.js tries to init again.

The walker checks the `config.init` value to see if a destination has been initialized, or not. This way you can add a destination that has already been initialized.

## Final words

We highly recommend writing a corresponding test. We plan to enhance the `Config` continuously. To prevent overriding or naming conflicts use the `custom` object.

Feel free to [contribute](https://github.com/elbwalker/walker.js#-contributing) you destinations.
