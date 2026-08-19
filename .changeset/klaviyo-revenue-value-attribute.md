---
'@walkeros/server-destination-klaviyo': patch
---

Revenue now reaches Klaviyo. A mapping rule's `settings.value` was written into
the event's `properties`, where Klaviyo stores it as a segmentable custom
property and ignores it for revenue reporting, while `valueCurrency` was set on
the event attributes with no sibling value to denominate. Both now sit together
on the attributes, which is where `klaviyo-api` serializes `value` and
`value_currency` from. Properties are unaffected -- map a value through the
rule's `data` mapping if you also want it as a custom property.
