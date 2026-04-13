# @walkeros/server-destination-slack

Server-side Slack destination for [walkerOS](https://github.com/elbwalker/walkerOS). Posts events to Slack as formatted notifications via either an Incoming Webhook or the official `@slack/web-api` SDK.

## Installation

```bash
npm install @walkeros/server-destination-slack
```

## Modes

The destination has two modes, selected by which auth setting you provide:

| Setting      | Mode    | Capabilities                                                 |
| ------------ | ------- | ------------------------------------------------------------ |
| `webhookUrl` | Webhook | Single channel, simple text + Block Kit                      |
| `token`      | Web API | Multi-channel, threading, DMs, ephemeral, structured errors  |

## Quick Start (Web API mode)

```json
{
  "destinations": {
    "slack": {
      "package": "@walkeros/server-destination-slack",
      "config": {
        "settings": {
          "token": "$SLACK_BOT_TOKEN",
          "channel": "#alerts"
        },
        "mapping": {
          "order": {
            "complete": {
              "settings": {
                "channel": "#sales",
                "text": ":moneybag: New order: ${data.id} - ${data.total} ${data.currency}"
              }
            }
          },
          "error": {
            "*": {
              "settings": {
                "channel": "#engineering-alerts",
                "text": ":rotating_light: ${data.severity}: ${data.message}"
              }
            }
          }
        }
      }
    }
  }
}
```

## Quick Start (Webhook mode)

```json
{
  "destinations": {
    "slack-deploys": {
      "package": "@walkeros/server-destination-slack",
      "config": {
        "settings": {
          "webhookUrl": "$SLACK_WEBHOOK_URL"
        },
        "mapping": {
          "deploy": {
            "complete": {
              "settings": {
                "text": ":rocket: Deployed ${data.version} to ${data.environment}"
              }
            }
          }
        }
      }
    }
  }
}
```

## Settings

| Setting         | Type    | Required | Default     | Description                                           |
| --------------- | ------- | -------- | ----------- | ----------------------------------------------------- |
| `token`         | string  | One of   | --          | Bot token (`xoxb-...`). Enables Web API mode          |
| `webhookUrl`    | string  | One of   | --          | Incoming Webhook URL. Enables webhook mode            |
| `channel`       | string  | Web API  | --          | Default channel ID or name                            |
| `text`          | string  | No       | --          | Default text template (`${data.field}` interpolation) |
| `blocks`        | array   | No       | --          | Default Block Kit blocks                              |
| `includeHeader` | boolean | No       | `true`      | Auto-add event-name header in default blocks         |
| `unfurlLinks`   | boolean | No       | `false`     | Enable link unfurling                                 |
| `unfurlMedia`   | boolean | No       | `false`     | Enable media unfurling                                |
| `mrkdwn`        | boolean | No       | `true`      | Use mrkdwn formatting                                 |
| `retryConfig`   | enum    | No       | `'default'` | Retry policy passed to WebClient                      |

## Mapping Settings

Per-event mapping settings override destination defaults and unlock advanced features.

| Setting              | Effect                                                       | Mode    |
| -------------------- | ------------------------------------------------------------ | ------- |
| `channel`            | Override channel for this rule                               | Web API |
| `text`               | Override text template                                       | Both    |
| `blocks`             | Override Block Kit blocks                                    | Both    |
| `threadTs`           | Post as a thread reply                                       | Web API |
| `replyBroadcast`     | Broadcast threaded reply to channel                          | Web API |
| `ephemeral` + `user` | Post via `chat.postEphemeral`                                | Web API |
| `dm` + `user`        | DM the user (`conversations.open` + `chat.postMessage`)      | Web API |

## Required Slack App Scopes (Web API mode)

- `chat:write` -- post messages to channels the bot is in
- `chat:write.public` -- post to any public channel without joining
- `im:write` -- open DM conversations (only needed for `dm: true`)

## Rate Limiting

- **Web API mode**: the SDK handles 429 with `Retry-After` automatically (default: 10 retries over ~30 min). Configure via `retryConfig`.
- **Webhook mode**: no automatic retry. Use Web API mode if you need retry on rate limit.

## Volume Notes

Slack is a notification channel, not an analytics warehouse. Use mapping `condition` to filter important events; route different events to different channels to spread the load.
