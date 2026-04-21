# @walkeros/web-destination-matomo

Matomo web destination for [walkerOS](https://github.com/elbwalker/walkerOS).
Forwards browser events to a self-hosted or cloud Matomo instance via the
`_paq.push()` command queue with support for page views, custom events,
ecommerce, goals, site search, content tracking, and custom dimensions.

## Installation

```bash
npm install @walkeros/web-destination-matomo
```

## Quick Start

```json
{
  "destinations": {
    "matomo": {
      "package": "@walkeros/web-destination-matomo",
      "config": {
        "loadScript": true,
        "settings": {
          "siteId": "1",
          "url": "https://analytics.example.com/"
        }
      }
    }
  }
}
```

## Settings

| Setting                | Type    | Required | Default | Description                                         |
| ---------------------- | ------- | -------- | ------- | --------------------------------------------------- |
| `siteId`               | string  | Yes      | --      | Matomo Site ID                                      |
| `url`                  | string  | Yes      | --      | Base URL of your Matomo instance                    |
| `disableCookies`       | boolean | No       | `false` | Disable tracking cookies for cookie-free analytics  |
| `enableLinkTracking`   | boolean | No       | `true`  | Auto-track outlinks and downloads                   |
| `enableHeartBeatTimer` | number  | No       | --      | Heart beat timer interval in seconds                |
| `customDimensions`     | Record  | No       | --      | Visit-scope custom dimensions (ID to property path) |

## Mapping Settings

Per-event mapping settings control specialized tracking methods:

| Setting              | Type    | Effect                                        |
| -------------------- | ------- | --------------------------------------------- |
| `goalId`             | string  | Fire `trackGoal` alongside the event          |
| `goalValue`          | string  | Property path for goal revenue value          |
| `siteSearch`         | boolean | Use `trackSiteSearch` instead of `trackEvent` |
| `contentImpression`  | boolean | Use `trackContentImpression`                  |
| `contentInteraction` | boolean | Use `trackContentInteraction`                 |
| `customDimensions`   | Record  | Action-scope custom dimensions per event      |

## Event Mapping

| walkerOS Event   | Matomo Method                | Notes                                               |
| ---------------- | ---------------------------- | --------------------------------------------------- |
| `page view`      | `trackPageView`              | Default, no mapping needed                          |
| Any event        | `trackEvent`                 | Default for non-page-view events via `mapping.name` |
| `order complete` | `trackEcommerceOrder`        | Via `mapping.name`                                  |
| `cart *`         | `trackEcommerceCartUpdate`   | Via `mapping.name`                                  |
| `product view`   | `ecommerceProductDetailView` | Via `mapping.name`                                  |
| `search *`       | `trackSiteSearch`            | Via `mapping.settings.siteSearch`                   |
