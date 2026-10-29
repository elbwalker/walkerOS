---
'@walkeros/destination-demo': patch
'@walkeros/server-destination-amplitude': patch
'@walkeros/server-destination-api': patch
'@walkeros/server-destination-mixpanel': patch
'@walkeros/server-destination-posthog': patch
'@walkeros/server-transformer-bot': patch
'@walkeros/server-transformer-file': patch
'@walkeros/server-transformer-fingerprint': patch
'@walkeros/transformer-demo': patch
'@walkeros/web-destination-amplitude': patch
'@walkeros/web-destination-api': patch
'@walkeros/web-destination-clarity': patch
'@walkeros/web-destination-d8a': patch
'@walkeros/web-destination-fullstory': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-heap': patch
'@walkeros/web-destination-hotjar': patch
'@walkeros/web-destination-linkedin': patch
'@walkeros/web-destination-matomo': patch
'@walkeros/web-destination-mixpanel': patch
'@walkeros/web-destination-optimizely': patch
'@walkeros/web-destination-piano': patch
'@walkeros/web-destination-pinterest': patch
'@walkeros/web-destination-piwikpro': patch
'@walkeros/web-destination-plausible': patch
'@walkeros/web-destination-posthog': patch
'@walkeros/web-destination-segment': patch
'@walkeros/web-destination-snowplow': patch
'@walkeros/web-destination-tiktok': patch
---

Step examples carry event timestamps in milliseconds, as the walkerOS event
model defines them, instead of seconds that read as a date in January 1970.
Where an example's output repeats the timestamp, such as `event_timestamp` in
the gtag include example or the event a transformer example returns, the output
shows the same value.
