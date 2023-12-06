---
title: Event model
---

## Entity-Action Approach

The Entity-Action approach forms the core of the walkerOS event model. It's a
framework designed to capture interactions in a structured yet flexible manner.
Two primary components define each event: the 'entity' (what the interaction
involves) and the 'action' (what is done with the entity). This method provides
a comprehensive and clear understanding of user behaviors and interactions.

## Example Event

Here's an example illustrating the structure and components of an event in
walkerOS. While keys are static, their content can be defined dynamically with
different value types.

```js
{
  event: 'promotion view', // Name as a combination of entity and action
  data: {
    // Arbitrary properties related to the entity
    name: 'Setting up tracking easily',
    interactive: false,
  },
  context: {
    // Provides additional information about the state during the event
    stage: ['learning', 1] // A logical funnel stage
    test: ['engagement', 0] // Key, [value, order]
  },
  custom: {}, // Additional space for individual setups
  globals: {
    // General properties that apply to every event
    language: 'en'
  },
  user: {
    // Contains user identifiers for different identification levels
    // Require consent and set manually for sessions building and cross-device
    id: 'userid',
    device: 'cookieid',
    session: 'sessionid',
  },
  nested: [
    // All nested entities within the main entity
    { type: "github", data: { repo: "walkerOS" } }
  ],
  consent: { functional: true }, // Status of the granted consent state(s)
  id: '1647261462000-01b5e2-5', // Timestamp, group & count of the event
  trigger: 'visible', // Name of the trigger that fired
  entity: 'promotion', // The entity name involved in the event
  action: 'view', // The specific action performed on the entity
  timestamp: 1647261462000, // Time when the event fired
  timing: 3.14, // Duration how long it took to trigger this event
  group: '01b5e2', // Random identifier for all events during a run
  count: 2, // Incremental counter of the events in the same run
  version: {
    // Information about the used implementation setup
    client: '1.0.0', // Semantic version of the used client
    tagging: 42, // A version number of the then-used tagging status
  },
  source: {
    // Details about the origin of the event
    type: 'web', // Source type of the event (also app, server, or custom one)
    id: 'https://github.com/elbwalker/walkerOS', // Source of the event's origin
    previous_id: 'https://www.elbwalker.com/' // Previous source (like referrer)
  }
}
```

This structure remains consistent across all interactions, whether a
`page view`, `page read`, `product add`, or `session start` and
`order complete`. Event names are a combination of the entities involved
(_promotion_) and the action performed (_view_).

### Data Properties

These properties describe the entity in more detail. Depending on the entity
(e.g., _product_, _order_, _article_), these can vary and provide specific
insights relevant to the interaction.

### Context

Context refers to the state or environment in which the event was triggered. It
could be as simple as a page position or as complex as the logical stage in a
user journey, like a shopping process from inspiration to checkout.

### Globals

Globals describe the overall state influencing events or user behavior. These
might include the theme used, page type for the web, or general cart value.

### User

Three identifiers are used for stitching together user journeys: id, device, and
session. This enables cross-device tracking or link sessions for a cohesive user
journey.

### Consent

Keeps the permissions granted by the user, which is crucial for subsequent data
processing and helpful to compliance with privacy regulations.

### Source

The source details the origin of the event, including type (web, app, server),
specific site or component, and referrer information for basic journey
attribution.

## Principles

### Structured Flexibility

The event model is tailored to fit a company's requirements while maintaining a
structured approach for easy data access and interpretation.

### First-Party

Data With walkerOS, data is collected directly and built into your code. This
ensures control over what, when, and where data is measured, enhancing data
management and privacy.

### Source of Truth

A single source of truth for data ensures comparability, manageability, and
minimizes implementation efforts, preventing data leaks or inaccuracies.

### Vendor Agnostic

The event model is designed to be resilient, flexible, and business-focused,
allowing for adaptability to future legal or internal requirements without
vendor lock-in.

### Industry Independent

The model supports diverse use cases beyond e-commerce, including publishers,
career sites, travel blogs, and more, ensuring versatility and comparability.

### Mapping

Mapping involves translating walkerOS events to the formats required by
different analytics tools. For example, a `product add` event in walkerOS can be
mapped to `add_to_cart` in GA4 or a corresponding event in another tool.
