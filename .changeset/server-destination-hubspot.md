---
'@walkeros/server-destination-hubspot': minor
---

Add server-side HubSpot CRM destination with custom event tracking via
events.send API, contact upsert via CRM API with state-based dedup, optional
batch mode (up to 500 events/flush), defaultProperties for attribution, and
graceful shutdown with queue flush.
