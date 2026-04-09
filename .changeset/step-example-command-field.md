---
'@walkeros/core': minor
'@walkeros/web-destination-gtag': patch
---

Add `command` field to `Flow.StepExample` for routing non-event inputs through
walker commands (`consent`, `user`, `run`, `config`). Replaces the gtag-only
`_consent: true` magic marker pattern. Test runners can now explicitly opt into
`elb('walker <command>', in)` instead of pushing `in` as a regular event.

**Breaking for anyone copying gtag's step-example test runner:** the
`_consent: true` magic marker on `mapping` is gone. Migrate to
`command: 'consent'` on `Flow.StepExample`.
