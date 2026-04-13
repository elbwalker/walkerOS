# Comparison Page Update Notes

Status: Draft — do not publish yet Source: Strategy discussion, 2026-04-08
Purpose: Capture positioning insights to fold into comparison pages when managed
service launches

---

## Context: What changes when managed service launches

walkerOS now offers both self-hosted (free, open source) and managed (EU
infrastructure, consumption-based pricing). This fundamentally changes several
comparison pages because walkerOS no longer loses on "setup complexity" or
"managed option" -- it wins on both axes against every competitor.

**New pricing to use across all pages:**

| Tier       | Price    | Server-side events/month |
| ---------- | -------- | ------------------------ |
| Free       | €0       | ~200-500k (TBD)          |
| Growth     | ~€149/mo | 5M                       |
| Scale      | ~€399/mo | 20M                      |
| Enterprise | custom   | unlimited                |

Client-side events are always free -- users only pay for server-side processed
events (events that hit walkerOS servers).

**Key new differentiator to add to all pages:**

> walkerOS managed is a pipe, not a store. Events are processed on EU
> infrastructure (Scaleway fr-par, Bunny EU) and forwarded directly to your own
> destinations (BigQuery, Meta CAPI, etc.). walkerOS never stores your event
> data. Your data asset lives in your warehouse, not ours.

**Lock-in clarification to add to all pages:**

walkerOS managed has partial lock-in (the hosted container, the billing
relationship, the endpoint URL) but not structural lock-in. The flow config is
portable JSON, the event schema is an open standard, and the data was always in
your own destinations. Switch to self-hosted any time and nothing changes
downstream.

---

## jentis.mdx

**Key new insights from 2026-04-08 discussion:**

### Pricing row needs updating

Current: `Free (paid support available)` Update to:
`Free self-hosted / from €149/mo managed`

This makes the price gap even starker: JENTIS from €490/mo vs walkerOS from
€149/mo managed (or free self-hosted).

### Self-hosted row needs updating

Current: walkerOS `Yes` vs JENTIS `No (managed only)` Update to: walkerOS
`Yes (self-hosted or managed)` -- walkerOS now wins on both axes.

### Setup complexity row needs updating

Current: walkerOS `Medium (self-hosted)` Update to: walkerOS
`Low–Medium (managed option available)`

### New row to add: Data warehouse support

| Feature                     | JENTIS                        | walkerOS                        |
| --------------------------- | ----------------------------- | ------------------------------- |
| Data warehouse destinations | Not confirmed / not prominent | Yes (BigQuery, Snowflake, etc.) |

JENTIS destinations are primarily ad platforms and marketing tools (GA4, Meta,
TikTok, Google Ads, LinkedIn, Klaviyo). No public mention of BigQuery or
Snowflake. Their model appears to be marketing-stack forwarding, not data
engineering.

**Note:** Verify this by requesting a JENTIS demo or checking their full
connector list before publishing. Strong claim but not 100% confirmed from
public pages.

### New "Data destinations" section to add

**JENTIS:** 50+ integrations focused on ad platforms and marketing tools (GA4,
Meta, TikTok, Google Ads, LinkedIn, Klaviyo). Primary use case is clean data
forwarding to your marketing stack.

**walkerOS:** Send events to any destination including data warehouses
(BigQuery, Snowflake), ad platforms, custom APIs, and internal systems. Primary
use case includes both marketing measurement and building a durable data asset
in your own warehouse.

### Positioning angle to emphasize

JENTIS solves "get clean data to your ad platforms." walkerOS solves "own your
entire event data infrastructure." These are not the same problem. A company
using walkerOS with BigQuery has a long-term data asset that JENTIS users don't
have -- their data history lives in their own warehouse, not in a vendor's
system.

### Lock-in section to update

Add nuance: walkerOS managed has partial lock-in (container, billing, endpoint
URL) but not structural lock-in. The event schema is an open standard, the flow
config is portable JSON, and data always goes directly to your destinations.
JENTIS lock-in includes your data model and your mapping logic, which live in
their proprietary UI.

---

## stape.mdx

**Key new insights from 2026-04-08 discussion:**

### Core positioning point to add

Stape is fundamentally a Google wrapper -- it hosts sGTM but does not remove the
Google dependency. For EU companies actively moving away from the Google stack,
sGTM does not solve the problem (still Google's format, Google's consent model,
Google's ecosystem). walkerOS removes the Google dependency entirely.

### Pricing row needs updating

Current: `Free (paid support available)` Update to:
`Free self-hosted / from €149/mo managed`

Stape starts at ~$29-99/mo. walkerOS managed is competitive on price and adds EU
infrastructure guarantee.

### New row to add: EU data residency

| Feature                | Stape                        | walkerOS                        |
| ---------------------- | ---------------------------- | ------------------------------- |
| EU-only infrastructure | No                           | Yes (Scaleway fr-par, Bunny EU) |
| GDPR by default        | Partial (still Google infra) | Yes                             |

### "Choose walkerOS if" section -- add bullet

- You are actively moving away from the Google ecosystem (sGTM is still a Google
  product)
- You need guaranteed EU data residency with no US transfers

### Key differences: Architecture section -- add

The Google dependency is the core issue. sGTM routes through Google's tag
system, their consent model, and their format. For EU companies concerned about
US data transfers, adding a server hop via Stape/sGTM does not remove the
underlying Google relationship. walkerOS has no Google dependency by design.

---

## segment.mdx

**Key new insights from 2026-04-08 discussion:**

### Pricing row needs updating

Current: `Free (paid support available)` Update to:
`Free self-hosted / from €149/mo managed`

### New row to add: EU data residency

| Feature                | Segment               | walkerOS                                |
| ---------------------- | --------------------- | --------------------------------------- |
| EU-only infrastructure | No (US-based, Twilio) | Yes (managed) or your own (self-hosted) |

Segment (Twilio) is US-based. Post-Schrems II this is a real procurement blocker
for many EU companies. Worth adding explicitly.

### Data ownership section -- strengthen

Add: For EU companies with a DPO or regulatory exposure (finance, health,
e-commerce above certain thresholds), EU data residency is often a procurement
requirement, not a preference. Segment's US infrastructure is a compliance
blocker for these buyers regardless of their privacy certifications.

---

## General notes for all pages

**New tagline to consider for comparisons intro:**

> "walkerOS is the only open-source event pipeline with managed EU
> infrastructure. Self-host for free, or deploy to our EU servers from €149/mo."

**Consistent framing for "walkerOS managed" across all pages:**

- EU infrastructure (Scaleway fr-par, Bunny EU)
- GDPR by default, no US data transfers
- Consumption-based pricing (server-side events only, client-side always free)
- Portable: self-host any time, take your config and data with you
- Pipe not store: data goes directly to your destinations, walkerOS never holds
  it

**Payment provider:** Paddle (EU merchant of record, handles VAT automatically).
Not Stripe.

**When to publish these updates:** After managed service MVP launches (H1 + H2
complete, Paddle integration live).
