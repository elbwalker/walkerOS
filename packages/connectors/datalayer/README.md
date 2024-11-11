# dataLayer connector for walkerOS

Made to be used with
[walker.js](https://www.npmjs.com/package/@elbwalker/walker.js) from
[walkerOS](https://github.com/elbwalker/walkerOS).

More detailed information and examples can be found in the
[documentation](https://www.elbwalker.com/docs/connectors/datalayer).

## 🤓 Usage


### API Commands

Typical `gtag` API commands like `config`, `get`, `set`, `event`, and `consent`
are all translated to objects. Command parameters are added to `data`. For the
`event` command the second parameter is used as the event name. For `consent`
both `granted` and `denied` values are translated to either `true` or `false`.

```js
gtag('event', 'foo', { bar: 'baz' }); // { event: "foo", data: { bar: "baz" }}
gtag('config', 'G-XXXXXXXXXX', { foo: "bar" }); // { event: "config G-XXXXXXXXXX", data: { foo: "bar" }}
gtag('consent' 'default', { ad_storage: 'denied' }); // { event: "consent default", data: { ad_storage: false }}
gtag('consent' 'update', { ad_storage: 'granted' }); // { event: "consent update", data: { ad_storage: true }}
gtag('set', 'campaign', { id: "abd" }); // { event: "set campaign", data: { id: "abc" }}
```
