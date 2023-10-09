---
title: Utils
subtitle: A collection of helpful functions for easier and privacy-friendly tracking setups
---

###### A collection of helpful functions for easier and privacy-friendly tracking setups

All util-functions are available through the npm package (@elbwalker/walker.js). They are not bundled for direct access in the browser version of walker.js to reduce file size. To use them you can import them.

## Invocations

To optimize the number of executions for e.g. performance optimizations or cost reduction, these functions could help.

### debounce

Grouping multiple calls in a single invocation after a specific wait time.

```js
import { debounce } from '@elbwalker/walker.js';

// debounce(fn, wait=1000)
debounce(console.log)("called");
```

### throttle

Limit the number of invocations within a delay time.

```js
import { throttle } from '@elbwalker/walker.js';

// throttle(fn, delay=1000)
throttle(console.log)("called");
```

## Session

Detect session client-side. There is no storage required, it's cookieless by default.

Rules to start a new session:
1. (Optional) Read storage for an existing sessionId, if it's not existing, it's a `New Session`
2. If the `Entry Type` is a reload of a page, it's no new session
3. If there are any `Marketing parameters` in the URL, it's a new session
4. If the `Referrer` is different from the current domain, it's a new session

![Some file I don't know](https://91951938-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MNYSefehQWgpbcQJFEb%2Fuploads%2FZEGsFYuEjmX0S36e9E1x%2Fimage.png?alt=media&token=a66c3c6d-fcd6-4e0d-987c-bfa073559de4)

`Marketing Parameters` can be extended (default: utm_campaign, utm_content, dclid, fbclid, gclid, utm_medium, msclkid, utm_source, utm_term)

`Referrer` domains can be extended, e.g. internal sub-domains.
`Data` can be pre-defined, e.g. to use your own id.

```js
startSession({
  data?: Walker.Properties;
  domains?: string[];
  isNew?: boolean;
  parameters?: MarketingParameters;
  referrer?: string;
  url?: string;
}) => Walker.Properties | false;
```

## Storage

To persist data on a device there are three common ways to write, read and delete values. Use cookies as a stage location when values should also be transmitted with each request. The localStorage can be used to persist data for a longer period and across all the browser's tabs. As a volatile memory for one specific task, the sessionStorage can be a good choice in terms of short-term persistence, where data is only available in one tab.

Following a privacy-by-design approach, the storage utils have an in-build max-age functionality, to specify the maximum lifetime of a value. The default is set to 30 minutes. While cookies get deleted automatically by a browser, this doesn't apply to localStorage and sessionStorage.

:::note[Info]
Not all data will be deleted automatically. But using the [storageRead](###storageRead) function will do a check and eventually removes a value if it's no longer valid.
:::

### storageWrite

```js
import { storageWrite } from '@elbwalker/walker.js';

// storageWrite(key, value, maxAgeInMinutes, storage, domain): void
// Write elbUserId to localStorage, valid for 60 min
// and returns the value using storageRead
storageWrite("elbUserId", "us3r1d", 60, 2); 
```

### storageRead

```js
import { storageRead } from '@elbwalker/walker.js';

// storageRead(key, storage): Walker.PropertyType
// Read the elbUserId from localStorage, returns '' if not available or invalid
storageRead("elbUserId", 2);
```

### storageDelete

```js
import { storageDelete } from '@elbwalker/walker.js';

// storageDelete(key, storage): void
// Delete the elbUserId from localStorage
storageDelete("elbUserId", 2);
```

## Stuff

Why not? They might be useful in any way.

### getByStringDot(event, key, i)

Access values from event by using the string-dot notation. Use the key `"data.id"` on `event: { data: { id: "wow" } }` to get the value `wow`.

Use the wildcard character * and i for dynamic access, like `"nested.*.id"` on `{ nested: [ 1, 2, { id: "impressive" } ] }` to get `impressive`.

The return type is unknown and will be `undefined` if the key doesn't exist.

### isVisible(element)

Used to check if an element is visible to the user.

```js
import { isVisible } from '@elbwalker/walker.js';

// isVisible(element: HTMLElement): boolean
isVisible(document.body) === true;
```