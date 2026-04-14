---
name: walkeros-writing-website
description:
  Use when writing or editing website content, landing page copy, marketing
  text, or UI strings. Covers tone, punctuation rules, and content standards.
---

# Writing Website Content

## When to Use This Skill

- Writing or editing landing page sections (hero, features, benefits,
  integrations)
- Writing marketing copy, taglines, or UI labels
- Reviewing website content for tone and style consistency
- Adding or updating copy in React components under `website/src/`

---

## Non-Negotiables

### No Em Dashes

Never use em dashes (`—`). Use a comma, period, or rephrase instead.

```text
CORRECT: "free and without sampling caps"
WRONG:   "free — without sampling caps"
```

This applies everywhere: component copy, MDX content, prop strings, comments.

### Tone

- Direct and developer-focused. No buzzword fluff.
- Avoid vague superlatives ("best", "powerful", "seamless").
- Prefer concrete over abstract: say what the tool actually does.

### Consistency

- Product name: **walkerOS** (lowercase "walker", uppercase "OS") — never
  "WalkerOS" or "walkeros"
- Always use sentence case for headings: "Why walkerOS" not "Why WalkerOS"
- Tool names follow their own brand casing: GA4, PostHog, Piwik PRO, TikTok

---

## Content Structure

Landing page sections follow this hierarchy:

```text
Hero         -> Primary value prop + CTA
Features     -> What it does (technical capabilities)
Integrations -> Available sources and destinations
Benefits     -> Why it matters (business/developer value)
CTA          -> Next action
```

Keep each section focused. Don't repeat the same point across sections. If a
benefit is covered in the hero description, remove it from the benefits section.

---

## Related Skills

- [walkeros-writing-documentation](../walkeros-writing-documentation/SKILL.md) -
  Docs and README standards
