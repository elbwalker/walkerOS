---
'@walkeros/web-destination-gtag': patch
---

The gtag settings say what they do: `gtm.domain` is the URL the container ID is
appended to, up to `?id=`; `ga4.pageview: false` stops gtag's own page_view
(history-change page views still fire); `ads.currency` defaults to EUR and
mapped data replaces it; and an Ads `label` sends a conversion only when its
rule also has a name.
