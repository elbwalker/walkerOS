<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/walker.js

Ready-to-use walkerOS browser bundle for instant web tracking, no build step
required.

[Documentation](https://www.walkeros.io/docs/apps/walkerjs) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/walker.js) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/apps/walkerjs)

## Installation

```bash
npm install @walkeros/walker.js
```

## Quick start

Queue events, load the bundle, and configure destinations:

```html
<script>
  function elb() {
    (window.elbLayer = window.elbLayer || []).push(arguments);
  }
  window.elbConfig = {
    collector: {
      destinations: {
        console: { push: (event) => console.log('Event:', event) },
      },
    },
  };
</script>
<script
  async
  data-elbconfig="elbConfig"
  src="https://cdn.jsdelivr.net/npm/@walkeros/walker.js@latest/dist/walker.js"
></script>
```

## Documentation

Full configuration, sources, and examples live in the docs:
**https://www.walkeros.io/docs/apps/walkerjs**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
