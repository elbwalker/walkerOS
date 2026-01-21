# FlowMap Diagrams Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Replace ASCII art flow diagrams in docs with styled FlowMap components
from @walkeros/explorer.

**Architecture:** Add FlowMap to MDXComponents for global availability, then
update each doc file to use `<FlowMap />` instead of ASCII diagrams like
`Sources → Collector → Destinations`.

**Tech Stack:** React, @walkeros/explorer (FlowMap component), Docusaurus MDX

---

## Task 1: Add FlowMap to MDXComponents

**Files:**

- Modify: `website/src/theme/MDXComponents.js`

**Step 1: Add FlowMap import**

Add `FlowMap` to the explorer imports:

```javascript
import {
  CodeBox,
  CodeSnippet,
  PropertyTable,
  DestinationInitDemo,
  DestinationDemo,
  LiveCode,
  FlowMap, // Add this
} from '@walkeros/explorer';
```

**Step 2: Export FlowMap in the default object**

Add to the exports:

```javascript
export default {
  // ... existing exports
  FlowMap, // Add this
};
```

**Step 3: Verify the website builds**

Run: `cd /workspaces/developer/walkerOS/website && npm run build` Expected:
Build succeeds without errors

---

## Task 2: Replace diagram in getting-started/index.mdx

**Files:**

- Modify: `website/docs/getting-started/index.mdx`

**Step 1: Replace the ASCII flow diagram**

Replace:

```

```

Sources → Collector → Destinations └──────────── Flow ────────────┘

```

```

With:

```jsx
<FlowMap
  sources={{ default: {} }}
  collector={{}}
  destinations={{ default: {} }}
/>
```

**Step 2: Replace the mapping diagram**

Replace:

```

```

Raw Input → [SOURCE MAPPING] → walkerOS Event → [DEST MAPPING] → Vendor Format

```

```

With:

```jsx
<FlowMap
  stageBefore={{ label: 'Raw Input' }}
  sources={{ default: { label: 'Source', text: 'Mapping' } }}
  collector={{ label: 'walkerOS', text: 'Event' }}
  destinations={{ default: { label: 'Dest', text: 'Mapping' } }}
  stageAfter={{ label: 'Vendor', text: 'Format' }}
/>
```

**Step 3: Verify page renders**

Run: `cd /workspaces/developer/walkerOS/website && npm run start` Expected:
Navigate to docs homepage, FlowMap diagrams render correctly

---

## Task 3: Replace diagram in collector/index.mdx

**Files:**

- Modify: `website/docs/collector/index.mdx`

**Step 1: Find and replace the flow diagram**

Replace the ASCII `Sources → Collector → Destinations` with:

```jsx
<FlowMap
  sources={{ default: {} }}
  collector={{}}
  destinations={{ default: {} }}
/>
```

**Step 2: Replace the destination mapping diagram**

Replace:
`walkerOS Event → [DESTINATION MAPPING] → Vendor Format (GA4, API, etc.)`

With:

```jsx
<FlowMap
  sources={{ default: { label: 'walkerOS', text: 'Event' } }}
  collector={{ label: 'Dest', text: 'Mapping' }}
  destinations={{ default: { label: 'Vendor', text: 'Format' } }}
/>
```

---

## Task 4: Replace diagram in destinations/index.mdx

**Files:**

- Modify: `website/docs/destinations/index.mdx`

**Step 1: Replace the flow diagram**

Replace: `Sources → Collector → Destinations → External Platforms`

With:

```jsx
<FlowMap
  sources={{ default: {} }}
  collector={{}}
  destinations={{ default: { highlight: true } }}
  stageAfter={{ label: 'External', text: 'Platforms' }}
/>
```

---

## Task 5: Replace diagram in sources/web/browser/index.mdx

**Files:**

- Modify: `website/docs/sources/web/browser/index.mdx`

**Step 1: Replace the flow diagram**

Replace: `Browser Source → Collector → Destinations`

With:

```jsx
<FlowMap
  sources={{ default: { label: 'Source', text: 'Browser', highlight: true } }}
  collector={{}}
  destinations={{ default: {} }}
/>
```

---

## Task 6: Replace diagram in sources/web/dataLayer/index.mdx

**Files:**

- Modify: `website/docs/sources/web/dataLayer/index.mdx`

**Step 1: Replace the flow diagram**

Replace: `DataLayer Source → Collector → Destinations`

With:

```jsx
<FlowMap
  sources={{ default: { label: 'Source', text: 'dataLayer', highlight: true } }}
  collector={{}}
  destinations={{ default: {} }}
/>
```

---

## Task 7: Replace diagram in destinations/web/gtag/index.mdx

**Files:**

- Modify: `website/docs/destinations/web/gtag/index.mdx`

**Step 1: Replace the flow diagram**

Replace: `Sources → Collector → Gtag Destination`

With:

```jsx
<FlowMap
  sources={{ default: {} }}
  collector={{}}
  destinations={{
    default: { label: 'Destination', text: 'Gtag', highlight: true },
  }}
/>
```

---

## Task 8: Replace diagrams in server source docs

**Files:**

- Modify: `website/docs/sources/server/fetch.mdx`
- Modify: `website/docs/sources/server/aws.mdx`
- Modify: `website/docs/sources/server/express.mdx`
- Modify: `website/docs/sources/server/gcp.mdx`

**Step 1: Replace fetch.mdx diagram**

Replace: `Fetch Source → Collector → Destinations`

With:

```jsx
<FlowMap
  sources={{ default: { label: 'Source', text: 'Fetch', highlight: true } }}
  collector={{}}
  destinations={{ default: {} }}
/>
```

**Step 2: Replace aws.mdx diagram**

Replace: `AWS Lambda Source → Collector → Destinations`

With:

```jsx
<FlowMap
  sources={{
    default: { label: 'Source', text: 'AWS Lambda', highlight: true },
  }}
  collector={{}}
  destinations={{ default: {} }}
/>
```

**Step 3: Replace express.mdx diagram**

Replace: `Express Source → Collector → Destinations`

With:

```jsx
<FlowMap
  sources={{ default: { label: 'Source', text: 'Express', highlight: true } }}
  collector={{}}
  destinations={{ default: {} }}
/>
```

**Step 4: Replace gcp.mdx diagram**

Replace: `GCP Source → Collector → Destinations`

With:

```jsx
<FlowMap
  sources={{ default: { label: 'Source', text: 'GCP', highlight: true } }}
  collector={{}}
  destinations={{ default: {} }}
/>
```

---

## Task 9: Replace diagram in getting-started/event-model.mdx

**Files:**

- Modify: `website/docs/getting-started/event-model.mdx`

**Step 1: Replace the mapping diagram**

Replace: `walkerOS Event → [MAPPING] → Destination Format`

With:

```jsx
<FlowMap
  sources={{ default: { label: 'walkerOS', text: 'Event' } }}
  collector={{ label: 'Mapping' }}
  destinations={{ default: { label: 'Destination', text: 'Format' } }}
/>
```

---

## Task 10: Final verification

**Step 1: Build the website**

Run: `cd /workspaces/developer/walkerOS/website && npm run build` Expected:
Build succeeds

**Step 2: Visual verification**

Run: `cd /workspaces/developer/walkerOS/website && npm run serve` Expected: All
FlowMap diagrams render correctly with hand-drawn styling

---

## Notes

- ASCII diagrams that are inline links like `[See Bundled Mode setup →]` should
  NOT be replaced (these are navigation links, not flow diagrams)
- The `highlight: true` prop emphasizes the current page's topic in the flow
- All FlowMap components will automatically support light/dark themes via
  explorer's CSS variables
