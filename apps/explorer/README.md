<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/explorer

Interactive React components for walkerOS documentation and exploration, with
live code editing and event visualization.

[Documentation](https://www.walkeros.io/docs) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/explorer) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/apps/explorer)

## Installation

```bash
npm install @walkeros/explorer
```

## Quick start

Import a component and the stylesheet:

```tsx
import { MappingDemo } from '@walkeros/explorer';
import '@walkeros/explorer/styles.css';

<MappingDemo
  input='{"name": "example"}'
  config='{"transform": "uppercase"}'
  fn={async (input, config) => transform(input, config)}
/>;
```

Switch themes via the `data-theme` attribute on a parent element (`light` or
`dark`).

## Documentation

Full component reference, styling, and examples live in the docs:
**https://www.walkeros.io/docs**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
