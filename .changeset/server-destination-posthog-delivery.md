---
'@walkeros/server-destination-posthog': patch
---

`settings.include` is removed; it had no effect, use `config.include`. Events
batch by default (`config.batch` 20 events or 10 seconds) through `pushBatch`; a
failed send fails its events and lands them in the dead-letter queue instead of
counting as delivered.
