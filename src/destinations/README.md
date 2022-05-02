# walker.js destinations

Understand the usage of destinations. Learn how to implement them & how to write you own.

- [elbwalker event pipe](#XXXX)
- [Google GA4](#XXXX)
- [Google Tag Manager](#XXXX)

Didn't find what you were looking for? [Request destination](https://github.com/elbwalker/walker.js/issues/new)

## 🤓 Write your own

Creating your own destinations should be easy. A valid `WebDestination.Function` consists of a `config` object, and the two methods:

```ts
interface Function {
  init?: () => boolean;
  push: (event: Elbwalker.Event) => void;
  config: Config;
}
```

### config

Simple: the destinations configuration. Set all necessary parameters and handle the states. It's separated to keep control of the destination once it's been added to the walker using `destination.config`.

### push(event)

The default interface the walker uses to deliver events to each destination.

### init

This function is optional. It has to return a boolean if initializaiton worked out properly. As long as init returns `false` no events will get pushed but each time an event occurs walker.js tries to init again.

The walker checks the `config.init` value to see if a destination has been initialized or not. This way you can add a destination that has already been initialized.

## final words

We highly recommend to write a corresponding test. We plan to enhance the `Config` continuously. To prevent overriding or naming conflicts use the `custom` object.

Feel free to [contribute](https://github.com/elbwalker/walker.js#-contributing) you destinations.
