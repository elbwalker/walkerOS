<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-core

Browser-specific utilities for client-side walkerOS implementations, covering
DOM interactions, browser information, storage, element visibility, web hashing,
and web-based communication.

[Documentation](https://www.walkeros.io/docs) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-core) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/core)

## Installation

```bash
npm install @walkeros/web-core
```

## Quick start

```ts
import { getAttribute, isVisible, sendWeb } from '@walkeros/web-core';

const element = document.querySelector('[data-elb="product"]');
const entity = getAttribute(element, 'data-elb');

if (isVisible(element)) {
  await sendWeb('https://api.example.com/events', { entity });
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
