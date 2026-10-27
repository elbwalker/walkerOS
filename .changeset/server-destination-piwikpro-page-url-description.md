---
'@walkeros/server-destination-piwikpro': patch
---

The `pageUrl` setting description and the batch hint now match the behaviour: an
event without a page URL, or one the rule cannot turn into a hit, fails the push
with `missing-input`. They no longer claim that such events are skipped. In a
batch, the other events are still sent.
