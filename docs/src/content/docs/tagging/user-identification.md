---
title: User identification
---

##### The different modes of identifying users with walker.js

You can add more information about the user by using three different levels of identification:

1. <b>ID</b>: e.g. user id from your CRM system
2. <b>Device</b>: e.g. a random value stored on a cookie
3. <b>Hash</b>: e.g. a session id

```js
import { elb } from '@elbwalker/walker.js';

elb("walker user", {
  id: "userid", // optional
  device: "deviceid", // optional
  hash: "sessionid" // optional
});
```

This example will lead to the following event:

```js
{
  "event": "entity action",
  "user": {
    "id": "userid",
    "device": "deviceid",
    "hash": "hashid"
  }
  // other properties omitted
}
```

:::caution[Caution]
We highly recommend only using fully anonymized & arbitrary ids by default and checking your options with persistent user IDs with your data protection officer.
:::