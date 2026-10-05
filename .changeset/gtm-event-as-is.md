---
'@walkeros/web-destination-gtag': patch
---

The GTM destination pushes the whole walkerOS event to the dataLayer when no
data mapping is configured, with `event` set to its name. Before, such a push
carried only the event name. Pushes with a mapping are unchanged and still carry
only the mapped values.
