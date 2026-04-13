import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationServer, sendServer } from '@walkeros/server-core';
import type {
  WebClient,
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  ChatPostEphemeralArguments,
  ChatPostEphemeralResponse,
  ConversationsOpenArguments,
  ConversationsOpenResponse,
} from '@slack/web-api';

/** A single Block Kit block (kept loose -- Slack does not export a union type). */
export type SlackBlock = Record<string, unknown>;

export interface Settings {
  // --- Auth (exactly one required) ---
  /** Slack Bot token (xoxb-...). Enables Web API mode. */
  token?: string;
  /** Incoming Webhook URL. Enables webhook mode. */
  webhookUrl?: string;

  // --- Target ---
  /** Default channel ID or name. Required for Web API mode unless every rule provides one. */
  channel?: string;

  // --- Message formatting ---
  /** Default text template. Supports `${data.field}` interpolation against the walkerOS event. */
  text?: string;
  /** Default Block Kit blocks applied when no mapping override is set. */
  blocks?: SlackBlock[];
  /** Auto-add an event-name header block when generating default blocks. Default: true. */
  includeHeader?: boolean;

  // --- Behavior ---
  /** Enable link unfurling. Default: false. */
  unfurlLinks?: boolean;
  /** Enable media unfurling. Default: false. */
  unfurlMedia?: boolean;
  /** Use mrkdwn formatting. Default: true. */
  mrkdwn?: boolean;

  // --- Threading ---
  /** Static thread_ts to reply to (rarely set at destination level). */
  threadTs?: string;

  // --- SDK config (Web API only) ---
  /** Retry policy passed to WebClient. Default: 'default'. */
  retryConfig?: 'default' | 'fiveRetriesInFiveMinutes' | 'none';

  // --- Runtime (not user-facing) ---
  _client?: WebClient;
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings. Override channel, text, blocks, and route
 * to threads / DMs / ephemeral.
 */
export interface Mapping {
  /** Override the channel for this rule (Web API mode only). */
  channel?: string;
  /** Override the text template for this rule. */
  text?: string;
  /** Override Block Kit blocks for this rule. */
  blocks?: SlackBlock[];
  /** thread_ts for posting as a reply in a thread. */
  threadTs?: string;
  /** Also broadcast the threaded reply back to the channel. */
  replyBroadcast?: boolean;
  /** Send via chat.postEphemeral instead of chat.postMessage. */
  ephemeral?: boolean;
  /** Slack user ID for ephemeral or DM delivery. */
  user?: string;
  /** Send as DM (conversations.open + chat.postMessage). Requires `user`. */
  dm?: boolean;
}

/**
 * Mock-friendly interface for the WebClient methods the destination calls.
 * Tests inject this via env.slackClient.
 */
export interface SlackClientMock {
  chat: {
    postMessage: (
      opts: ChatPostMessageArguments,
    ) => Promise<ChatPostMessageResponse>;
    postEphemeral: (
      opts: ChatPostEphemeralArguments,
    ) => Promise<ChatPostEphemeralResponse>;
  };
  conversations: {
    open: (
      opts: ConversationsOpenArguments,
    ) => Promise<ConversationsOpenResponse>;
  };
}

/**
 * Env -- optional SDK / transport overrides. Production leaves these undefined.
 * Tests inject `slackClient` (Web API mode) and/or `sendServer` (webhook mode).
 */
export interface Env extends DestinationServer.Env {
  slackClient?: SlackClientMock;
  sendServer?: typeof sendServer;
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export interface Destination extends DestinationServer.Destination<Types> {
  init: DestinationServer.InitFn<Types>;
}

export type Config = {
  settings: Settings;
} & DestinationServer.Config<Types>;

export type InitFn = DestinationServer.InitFn<Types>;
export type PushFn = DestinationServer.PushFn<Types>;
export type PartialConfig = DestinationServer.PartialConfig<Types>;
export type PushEvents = DestinationServer.PushEvents<Mapping>;
export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
