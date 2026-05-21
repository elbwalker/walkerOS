<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-core

Node.js-specific utilities for server-side walkerOS implementations, covering
HTTP communication and cryptographic hashing for backend event processing.

[Documentation](https://www.walkeros.io/docs/sources/server) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-core) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/core)

## Installation

```bash
npm install @walkeros/server-core
```

## Quick start

```ts
import { sendServer, getHashServer } from '@walkeros/server-core';

const anonymousId = await getHashServer('user123@example.com', 16);

const response = await sendServer('https://api.example.com/events', {
  name: 'page view',
  data: { url: '/home', userId: anonymousId },
});
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/server**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
