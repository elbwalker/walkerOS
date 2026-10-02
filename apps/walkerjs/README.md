<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/walker.js

One script tag turns `data-elb` attributes into rich `dataLayer` pushes that
Google Tag Manager can use. No configuration, no build step.

[Documentation](https://www.walkeros.io/docs/apps/walkerjs) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/walker.js) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/apps/walkerjs)

## Quick start

```html
<script async src="https://static.walkeros.io/vX.Y/walker.js"></script>
```

Replace `vX.Y` with the current release line, shown in the
[documentation](https://www.walkeros.io/docs/apps/walkerjs).

Tag what matters:

```html
<div
  data-elb="product"
  data-elb-product="name:Cotton Tee;price:25"
  data-elbaction="load:view"
></div>
```

## What lands in the dataLayer

Each event is pushed as the full walkerOS event plus `event` (its name, such as
`"product view"`) and `_clear: true`. Page views are sent on load and on every
single-page app route change.

## Self-hosting

Download the file and serve it from your own domain.

## Need more?

Destinations, consent, custom mappings: build your own in the walkerOS app at
[app.walkeros.io](https://app.walkeros.io).

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
