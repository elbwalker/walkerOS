<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# Web Core Utilities for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/core)
&bull; [NPM Package](https://www.npmjs.com/package/@walkeros/web-core)

Web core utilities are browser-specific functions designed for client-side
walkerOS implementations. These utilities handle DOM interactions, browser
information, storage, element visibility, and web-based communication.

> **Note**: Session management has been moved to `@walkeros/web-source-session`.
> See the [session source package](../sources/session/README.md) for session
> tracking.

## Installation

Import web utilities from the `@walkeros/web-core` package:

```ts
import { getAttribute, sendWeb, isVisible } from '@walkeros/web-core';
```

## Utilities

### DOM Utilities

#### getAttribute

`getAttribute(element: Element, name: string): string` retrieves attribute
values from DOM elements with enhanced handling.

```js
const element = document.querySelector('[data-elb="product"]');
const entityType = getAttribute(element, 'data-elb'); // Returns 'product'
```

#### Attribute Parsing

##### splitAttribute

`splitAttribute(str: string, separator?: string): string[]` splits attribute
strings using specified separators.

```js
splitAttribute('id:123,name:shirt', ','); // Returns ['id:123', 'name:shirt']
```

##### splitKeyVal

`splitKeyVal(str: string): [string, string]` splits key-value pairs from
attribute strings.

```js
splitKeyVal('id:123'); // Returns ['id', '123']
```

##### parseInlineConfig

`parseInlineConfig(str: string): Record<string, unknown>` parses inline
configuration strings from HTML attributes.

```js
parseInlineConfig('{"tracking": true, "debug": false}');
// Returns { tracking: true, debug: false }
```

### Browser Information

#### getLanguage

`getLanguage(navigatorRef: Navigator): string | undefined` extracts the user's
preferred language.

```js
getLanguage(navigator); // Returns 'en-US' or user's language
```

#### getTimezone

`getTimezone(): string | undefined` gets the user's timezone from the Intl API.

```js
getTimezone(); // Returns 'America/New_York' or user's timezone
```

#### getScreenSize

`getScreenSize(windowRef: Window): string` returns the window's screen
dimensions.

```js
getScreenSize(window); // Returns '1920x1080' or current screen size
```

### Element Visibility

#### isVisible

`isVisible(element: HTMLElement): boolean` checks if an element is visible to
the user.

```js
const promoElement = document.getElementById('promotion');
if (isVisible(promoElement)) {
  // Element is visible on screen
}
```

This function considers:

- Element display and visibility styles
- Element position within viewport
- Parent element visibility
- Intersection with the visible area

### Storage Management

#### Storage Operations

##### storageRead

`storageRead(key: string, storage?: StorageType): WalkerOS.PropertyType` reads
data from browser storage with automatic type conversion.

```js
// Default uses sessionStorage
const userId = storageRead('walker_user_id');

// Use localStorage
const data = storageRead('data', 'local');
```

##### storageWrite

`storageWrite(key: string, value: WalkerOS.PropertyType, maxAgeInMinutes?: number, storage?: StorageType, domain?: string): WalkerOS.PropertyType`
writes data to storage with expiration and domain options.

```js
// Store with 30-minute expiration
storageWrite('user_preference', 'dark-mode', 30);

// Store in localStorage
storageWrite('temp_data', { id: 123 }, undefined, 'local');

// Store with custom domain for cookies
storageWrite('tracking_id', 'abc123', 1440, 'cookie', '.example.com');
```

##### storageDelete

`storageDelete(key: string, storage?: StorageType)` removes data from storage.

```js
storageDelete('expired_data');
storageDelete('session_temp', 'local');
```

### Web Communication

#### sendWeb

`sendWeb<T>(url: string, data?: SendDataValue, options?: SendWebOptionsDynamic<T>): SendWebReturn<T>`
sends data using various web transport methods.

```js
// Default fetch transport
await sendWeb('https://api.example.com/events', eventData);

// Use specific transport
await sendWeb(url, data, { transport: 'beacon' });
await sendWeb(url, data, { transport: 'xhr' });

// With custom headers
await sendWeb(url, data, {
  headers: { Authorization: 'Bearer token' },
  method: 'PUT',
});
```

#### Transport-Specific Functions

##### sendWebAsFetch

`sendWebAsFetch(url: string, data?: SendDataValue, options?: SendWebOptionsFetch): Promise<SendResponse>`
uses the modern Fetch API with advanced options.

```js
await sendWebAsFetch(url, data, {
  credentials: 'include',
  noCors: true,
  headers: { 'Content-Type': 'application/json' },
});
```

##### sendWebAsBeacon

`sendWebAsBeacon(url: string, data?: SendDataValue): SendResponse` uses the
Beacon API for reliable data transmission, especially during page unload.

```js
// Reliable sending during page unload
window.addEventListener('beforeunload', () => {
  sendWebAsBeacon('/analytics/pageview', { duration: Date.now() - startTime });
});
```

##### sendWebAsXhr

`sendWebAsXhr(url: string, data?: SendDataValue, options?: SendWebOptions): SendResponse`
uses XMLHttpRequest for synchronous communication.

```js
// Synchronous request (blocks execution)
const response = sendWebAsXhr(url, data, { method: 'POST' });
```

### Web Hashing

#### getHashWeb

`getHashWeb(str: string, length?: number): Promise<string>` generates SHA-256
hashes using the Web Crypto API.

```js
// Generate hash for fingerprinting
const userFingerprint = await getHashWeb(
  navigator.userAgent + navigator.language + screen.width,
  16,
);
// Returns shortened hash like '47e0bdd10f04ef13'
```

## Configuration Types

### SendWebOptions

```ts
interface SendWebOptions {
  headers?: Record<string, string>;
  method?: string; // Default: 'POST'
  transport?: 'fetch' | 'beacon' | 'xhr'; // Default: 'fetch'
}

interface SendWebOptionsFetch extends SendWebOptions {
  credentials?: 'omit' | 'same-origin' | 'include';
  noCors?: boolean;
}
```

### StorageType

```ts
type StorageType = 'local' | 'session' | 'cookie';
```

## Usage Notes

- **Consent Required**: Browser information functions may require user consent
  depending on privacy regulations
- **Transport Selection**: Choose transport based on use case:
  - `fetch` - Modern, flexible, supports responses
  - `beacon` - Reliable during page unload, small payloads
  - `xhr` - Synchronous when needed, broader browser support

---

For platform-agnostic utilities, see
[Core Utilities](https://www.walkeros.io/docs/core).

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
