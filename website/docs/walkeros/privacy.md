---
title: Privacy
---

You can define required consent states for each destination individually. With
each event, the consent states get checked. The walker.js handles the race
conditions. If there is no required consent yet, the event will be added to an
ordered queue. The queue is reset with each `walker run` command. And will be
(re-)processed with each `walker consent` update. Typically a Consent Management
Platform (CMP) handles the consent. This is an asynchronous process. To
set/change the consent state, the CMP should push one command with the
permission state (true/false) of a group or an individual tool. If only one
condition applies, consent is granted. Updating only one value won't override
others.

```js
function elb() {
  (window.elbLayer = window.elbLayer || []).push(arguments);
}
elb('walker consent', { marketing: true });
```

The walker handles the <b>race conditions</b>: Previously pushed events during a
run get processed in the right order after granting the consent state with the
destinations as well as new ones.

:::note[Info] The queue events properties <b>consent, globals, user will be
updated</b> to the current state before processing them. :::

You are free to define consent keys (typically known as <i>functional,
statistics,</i> and <i>marketing</i>). But you can also use individual names for
each vendor. The key has to match with the key used in each
`destination.config.consent`.

:::note[Info] A destination only requires one granted consent state to process
events :::

To revoke consent and stop sharing events with a destination set all matching
rules to false:

```js
elb('walker consent', { marketing: false });
```
