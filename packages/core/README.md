<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src="https://www.elbwalker.com/img/elbwalker_logo.png" width="256px"/>
  </a>
</p>

# Core Types & Utilities for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/core)
&bull; [NPM Package](https://www.npmjs.com/package/@walkeros/core)

Core utilities are a collection of platform-agnostic functions that can be used
across all walkerOS environments. They provide standardized building blocks for
data manipulation, validation, mapping, and more.

## Installation

Import the core utilities directly from the `@walkeros/core` package:

```ts
import { assign, anonymizeIP, getMappingValue } from '@walkeros/core';
```

## Core Utilities

### Data Manipulation

#### assign

`assign<T, U>(target: T, source: U, options?): T & U` merges two objects with
advanced merging capabilities. It has special behavior for arrays: when merging,
it concatenates arrays from both objects, removing duplicates.

```ts
interface AssignOptions {
  merge?: boolean; // Merge array properties (default: true)
  shallow?: boolean; // Create shallow copy (default: true)
  extend?: boolean; // Extend with new properties (default: true)
}

const obj1 = { a: 1, b: [1, 2] };
const obj2 = { b: [2, 3], c: 3 };

assign(obj1, obj2); // Returns { a: 1, b: [1, 2, 3], c: 3 }
assign(obj1, obj2, { merge: false }); // Returns { a: 1, b: [2, 3], c: 3 }
```

#### Path Operations

##### getByPath

`getByPath(object: unknown, path: string, defaultValue?: unknown): unknown`
accesses nested properties using dot notation. Supports wildcard `*` for array
iteration.

```js
getByPath({ data: { id: 'wow' } }, 'data.id'); // Returns "wow"
getByPath({ nested: [1, 2, { id: 'cool' }] }, 'nested.*.id'); // Returns ['', '', 'cool']
getByPath({ arr: ['foo', 'bar'] }, 'arr.1'); // Returns "bar"
```

##### setByPath

`setByPath(object: WalkerOS.Event, path: string, value: unknown): WalkerOS.Event`
sets nested values using dot notation, returning a new object with the updated
value.

```js
const updatedEvent = setByPath(event, 'data.id', 'new-value');
// Returns a new event with data.id set to 'new-value'
```

#### clone

`clone<T>(original: T): T` creates a deep copy of objects/arrays with circular
reference handling.

```js
const original = { foo: true, arr: ['a', 'b'] };
const cloned = clone(original);
original.foo = false; // cloned.foo remains true
```

#### castValue

`castValue(value: unknown): WalkerOS.PropertyType` converts string values to
appropriate types (number, boolean).

```js
castValue('123'); // Returns 123 (number)
castValue('true'); // Returns true (boolean)
castValue('hello'); // Returns 'hello' (unchanged)
```

### Privacy & Security

#### anonymizeIP

`anonymizeIP(ip: string): string` anonymizes IPv4 addresses by setting the last
oclet to zero.

```js
anonymizeIP('192.168.1.100'); // Returns '192.168.1.0'
```

#### Hashing

`getId(length?: number): string` generates random alphanumeric strings for
unique identifiers.

```js
getId(); // Returns random 6-char string like 'a1b2c3'
getId(10); // Returns 10-character string
```

### Event Processing

#### getMappingValue

`getMappingValue(event: WalkerOS.Event, mapping: Mapping.Data, options?: Mapping.Options): Promise<WalkerOS.Property | undefined>`
extracts values from events using
[mapping configurations](https://www.elbwalker.com/docs/destinations/event-mapping).

```ts
// Simple path mapping
await getMappingValue(event, 'data.productId');

// Complex mapping with conditions and loops
const mapping = {
  map: {
    orderId: 'data.id',
    products: {
      loop: [
        'nested',
        {
          condition: (entity) => entity.type === 'product',
          map: { id: 'data.id', name: 'data.name' },
        },
      ],
    },
  },
};
await getMappingValue(event, mapping);
```

#### getMappingEvent

`getMappingEvent(event: WalkerOS.PartialEvent, mapping?: Mapping.Rules): Promise<Mapping.Result>`
finds the appropriate mapping rule for an event.

### Marketing & Analytics

#### getMarketingParameters

`getMarketingParameters(url: URL, custom?: MarketingParameters): WalkerOS.Properties`
extracts UTM and click ID parameters from URLs.

```js
getMarketingParameters(
  new URL('https://example.com/?utm_source=docs&gclid=123'),
);
// Returns { source: "docs", gclid: "123", clickId: "gclid" }

// With custom parameters
getMarketingParameters(url, { utm_custom: 'custom', partner: 'partnerId' });
```

### Type Validation

#### Type Checkers

A comprehensive set of type checking functions:

- `isString(value)`, `isNumber(value)`, `isBoolean(value)`
- `isArray(value)`, `isObject(value)`, `isFunction(value)`
- `isDefined(value)`, `isSameType(a, b)`
- `isPropertyType(value)` - Checks if value is valid walkerOS property

#### Property Utilities

- `castToProperty(value)` - Casts to valid property type
- `filterValues(object)` - Filters object to valid properties only
- `isPropertyType(value)` - Type guard for property validation

### Request Handling

#### requestToData

`requestToData(parameter: unknown): WalkerOS.AnyObject | undefined` converts
query strings to JavaScript objects with type casting.

```js
requestToData('a=1&b=true&c=hello&arr[0]=x&arr[1]=y');
// Returns { a: 1, b: true, c: 'hello', arr: ['x', 'y'] }
```

#### requestToParameter

`requestToParameter(data: WalkerOS.AnyObject): string` converts objects to
URL-encoded query strings.

```js
requestToParameter({ a: 1, b: true, arr: ['x', 'y'] });
// Returns 'a=1&b=true&arr[0]=x&arr[1]=y'
```

### User Agent Parsing

#### parseUserAgent

`parseUserAgent(userAgent?: string): WalkerOS.User` extracts browser, OS, and
device information.

```js
parseUserAgent(navigator.userAgent);
// Returns { browser: 'Chrome', browserVersion: '91.0', os: 'Windows', ... }
```

Individual functions are also available:

- `getBrowser(userAgent)` - Returns browser name
- `getBrowserVersion(userAgent)` - Returns browser version
- `getOS(userAgent)` - Returns operating system
- `getOSVersion(userAgent)` - Returns OS version
- `getDeviceType(userAgent)` - Returns 'Desktop', 'Tablet', or 'Mobile'

### Error Handling

#### tryCatch

`tryCatch(tryFn: Function, catchFn?: Function, finallyFn?: Function)` wraps
functions with error handling.

```js
const safeParse = tryCatch(JSON.parse, () => ({}));
safeParse('{"valid": "json"}'); // Parses successfully
safeParse('invalid'); // Returns {} instead of throwing
```

#### tryCatchAsync

`tryCatchAsync(tryFn: Function, catchFn?: Function, finallyFn?: Function)` for
async operations.

```js
const safeAsyncCall = tryCatchAsync(
  () => fetchUserData(),
  (error) => ({ error: 'Failed to load user' }),
);
```

### Performance Optimization

#### debounce

`debounce(fn: Function, wait?: number)` delays function execution until after
the wait time.

```js
const debouncedSearch = debounce(searchFunction, 300);
// Only executes after 300ms of inactivity
```

#### throttle

`throttle(fn: Function, wait?: number)` limits function execution frequency.

```js
const throttledScroll = throttle(scrollHandler, 100);
// Executes at most every 100ms
```

### Utilities

#### trim

`trim(str: string): string` removes whitespace from string ends.

#### throwError

`throwError(message: string)` throws descriptive errors.

#### onLog

`onLog(message: unknown, verbose?: boolean)` provides consistent logging.

```js
onLog('Debug info', true); // Logs message
onLog('Silent message'); // No output
```

### Validation

#### validateEvent

`validateEvent(obj: unknown, customContracts?: Schema.Contracts): WalkerOS.Event | never`
validates event structure and throws on invalid events.

#### validateProperty

Validates that values conform to walkerOS property types.

---

For platform-specific utilities, see:

- [Web Core](https://www.elbwalker.com/docs/core/web) - Browser-specific
  functions
- [Server Core](https://www.elbwalker.com/docs/core/server) - Node.js server
  functions

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
