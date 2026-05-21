<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/storybook-addon

Visualize, debug, and validate walkerOS events directly in your Storybook
stories.

[Documentation](https://www.walkeros.io/docs/apps/storybook) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/storybook-addon) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/apps/storybook-addon)

## Installation

```bash
npm install --save-dev @walkeros/storybook-addon
```

## Quick start

Register the addon in your Storybook config:

```ts
// .storybook/main.ts
const config: StorybookConfig = {
  addons: ['@walkeros/storybook-addon'],
};
```

Tag a component, and the addon's Events panels list the detected walkerOS events
as you interact with your stories.

## Documentation

Full configuration, panels, and examples live in the docs:
**https://www.walkeros.io/docs/apps/storybook**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
