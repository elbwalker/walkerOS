---
'@walkeros/explorer': minor
---

Add a site layer for marketing and communication pages:
`@walkeros/explorer/site` exports Open Air page components (Badge, SiteButton,
SectionHead, SplitSection, CodePanel, ProofGrid, LimitsBlock), with
`@walkeros/explorer/site.css` for their styles and
`@walkeros/explorer/tokens.css` for the design tokens alone. The site layer is a
separate entry point, so pages using it do not pull the editor and form
dependencies of the main export.

The existing export, its components and `styles.css` are unchanged.
