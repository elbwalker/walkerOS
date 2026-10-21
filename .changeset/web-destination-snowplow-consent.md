---
'@walkeros/web-destination-snowplow': patch
---

On a revocation, activity tracking and the link, form, button and YouTube
plugins switch off and come back on a grant. Error tracking and FocalMeter have
no off switch, so a revocation fails visibly (`consent-not-applied`). With
`settings.tracker`, URL plugins fail at `init` with a `config` error.
