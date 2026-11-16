<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-source-cmp-cookieconsent

Consent source for CookieConsent by orestbida (v3): maps the visitor's accepted
and rejected categories to walkerOS consent groups.

[Documentation](https://www.walkeros.io/docs/sources/web/cmps/cookieconsent)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-source-cmp-cookieconsent)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/cmps/cookieconsent)

## Installation

```bash
npm install @walkeros/web-source-cmp-cookieconsent
```

## Quick start

```ts
import { startFlow } from '@walkeros/collector';
import { sourceCookieConsent } from '@walkeros/web-source-cmp-cookieconsent';

await startFlow({
  sources: {
    consent: {
      code: sourceCookieConsent,
    },
  },
});
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/web/cmps/cookieconsent**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
