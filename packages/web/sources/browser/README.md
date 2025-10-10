<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/img/elbwalker_logo.png' width="256px"/>
  </a>
</p>

# Browser DOM Source for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/sources/browser)
&bull; [NPM Package](https://www.npmjs.com/package/@walkeros/web-source-browser)

The Browser Source is walkerOS's primary web tracking solution that you can use
to capture user interactions directly from the browsers DOM.

## What It Does

The Browser Source transforms your website into a comprehensive tracking
environment by:

- **Data attribute reading**: Extracts custom tracking data from HTML `data-elb`
  attributes
- **Session management**: Detects and handles user sessions automatically

## Installation

### With npm

Install the source via npm:

```bash
npm install @walkeros/web-source-browser
```

Setup in your project:

```javascript
import { startFlow } from '@walkeros/collector';
import { createSource } from '@walkeros/core';
import { sourceBrowser } from '@walkeros/web-source-browser';

const { collector } = await startFlow({
  sources: {
    browser: createSource(sourceBrowser, {
      settings: {
        pageview: true,
        session: true,
        elb: 'elb', // Browser source will set window.elb automatically
      },
    }),
  },
});
```

### With a script tag

Load the source via dynamic import:

```html
<script>
  // Load the collector, core utilities, and source
  const { startFlow } = await import(
    'https://cdn.jsdelivr.net/npm/@walkeros/collector/dist/index.mjs'
  );
  const { createSource } = await import(
    'https://cdn.jsdelivr.net/npm/@walkeros/core/dist/index.mjs'
  );
  const { sourceBrowser } = await import(
    'https://cdn.jsdelivr.net/npm/@walkeros/web-source-browser/dist/index.mjs'
  );

  const { collector, elb } = await startFlow({
    sources: {
      browser: createSource(sourceBrowser, {
        settings: {
          prefix: 'data-elb',
          pageview: true,
          session: true,
        },
      }),
    },
  });
</script>
```

## Configuration reference

| Name       | Type                             | Description                                      | Required | Example                          |
| ---------- | -------------------------------- | ------------------------------------------------ | -------- | -------------------------------- |
| `prefix`   | `string`                         | Prefix for data attributes used in DOM tracking  | No       | `'data-elb'`                     |
| `scope`    | `Element \| Document`            | DOM scope for event tracking (default: document) | No       | `document.querySelector("#app")` |
| `pageview` | `boolean`                        | Enable automatic pageview tracking               | No       | `true`                           |
| `session`  | `boolean`                        | Enable session tracking and management           | No       | `true`                           |
| `elb`      | `string`                         | Custom name for the global elb function          | No       | `'elb'`                          |
| `name`     | `string`                         | Custom name for the browser source instance      | No       | `'mySource'`                     |
| `elbLayer` | `boolean \| string \| Elb.Layer` | Enable elbLayer for async command queuing        | No       | `true`                           |

### elb

> **Two Different elb Functions**
>
> The collector provides **two different elb functions**:
>
> 1.  **Collector elb** (`elb` from `startFlow`): Basic event tracking that
>     works with all sources and destinations
> 2.  **Browser Source elb** (`collector.sources.browser.elb` or direct from
>     `createSource`): Enhanced function with browser-specific features
>
> **Browser Source elb adds:**
>
> - **DOM Commands**: `walker init` for asynchronous loading of DOM elements
> - **Flexible Arguments**: Support for multiple argument patterns
> - **elbLayer Integration**: Automatic processing of queued commands
> - **Element parameters**: Support for element parameters in DOM commands
>
> Use **separate source creation** for direct access to the enhanced elb
> function, or access it via `collector.sources.browser.elb` in the unified API.
>
> See [Commands](https://www.elbwalker.com/docs/sources/web/browser/commands)
> for full browser source API documentation.

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
