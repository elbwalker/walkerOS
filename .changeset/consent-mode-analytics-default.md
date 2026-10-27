---
'@walkeros/web-core': patch
'@walkeros/web-destination-gtag': patch
'@walkeros/web-destination-d8a': patch
---

The gtag and d8a destinations now set `analytics_storage` from `analytics`
consent instead of `functional` by default, matching what the Cookiebot,
CookieFirst and CookiePro sources report. With the Usercentrics source, map your
measurement category to `analytics` in its `categoryMap`. If your consent
commands report measurement consent as `functional`, map it yourself, like
`como: { functional: 'analytics_storage', marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'] }`.
When several consent keys map to one parameter, the parameter is granted only if
all of them are granted in the current consent state; before, the key that came
last won.
