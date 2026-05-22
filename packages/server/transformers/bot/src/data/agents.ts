/**
 * Curated AI agent UA-substring map (2026-Q2).
 *
 * Each entry: substring matched case-insensitively against the User-Agent,
 * a product label written to event.user.agentProduct, and the purpose category.
 *
 * Purpose semantics:
 *   - 'training'     — crawls for model training; usually filter from analytics
 *   - 'search-index' — crawls to power AI search answers; AEO-relevant
 *   - 'user-action'  — fetch initiated by a human via an AI tool; often kept as traffic
 *
 * Order matters: first-hit wins. More-specific entries must precede broader ones.
 *
 * Vendor docs of record (verified 2026-05):
 *   OpenAI:        https://platform.openai.com/docs/bots
 *   Anthropic:     https://support.claude.com/en/articles/8896518
 *   Perplexity:    https://docs.perplexity.ai/guides/bots
 *   Meta:          https://developers.facebook.com/docs/sharing/webmasters/web-crawlers
 *   Google:        https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
 *   Apple:         https://support.apple.com/en-us/119829
 *   DuckDuckGo:    https://duckduckgo.com/duckduckbot
 *   Common Crawl:  https://commoncrawl.org/faq
 *   Amazon:        https://developer.amazon.com/amazonbot
 *
 * Community cross-reference: https://github.com/ai-robots-txt/ai.robots.txt
 *
 * Reviewed quarterly — see /workspaces/developer/docs/research/2026-05-13-bot-detection.md.
 */
export interface AgentEntry {
  match: string;
  product: string;
  purpose: 'training' | 'search-index' | 'user-action';
}

export const agents: AgentEntry[] = [
  // --- OpenAI ---
  { match: 'ChatGPT-User', product: 'ChatGPT-User', purpose: 'user-action' },
  { match: 'ChatGPT-Agent', product: 'ChatGPT-Agent', purpose: 'user-action' },
  { match: 'OAI-SearchBot', product: 'OAI-SearchBot', purpose: 'search-index' },
  { match: 'GPTBot', product: 'GPTBot', purpose: 'training' },

  // --- Anthropic ---
  // Claude-SearchBot must precede Claude-User (defensive specificity for composite UAs)
  {
    match: 'Claude-SearchBot',
    product: 'Claude-SearchBot',
    purpose: 'search-index',
  },
  { match: 'Claude-User', product: 'Claude-User', purpose: 'user-action' },
  { match: 'Claude-Code', product: 'Claude-Code', purpose: 'user-action' },
  { match: 'ClaudeBot', product: 'ClaudeBot', purpose: 'training' },
  // Legacy: only used by older Anthropic crawlers; kept for back-compat with old logs.
  { match: 'anthropic-ai', product: 'anthropic-ai', purpose: 'training' },

  // --- Perplexity ---
  {
    match: 'Perplexity-User',
    product: 'Perplexity-User',
    purpose: 'user-action',
  },
  {
    match: 'PerplexityBot',
    product: 'PerplexityBot',
    purpose: 'search-index',
  },

  // --- Mistral ---
  {
    match: 'MistralAI-User',
    product: 'MistralAI-User',
    purpose: 'user-action',
  },

  // --- Meta ---
  {
    match: 'Meta-ExternalFetcher',
    product: 'Meta-ExternalFetcher',
    purpose: 'user-action',
  },
  {
    match: 'Meta-ExternalAgent',
    product: 'Meta-ExternalAgent',
    purpose: 'training',
  },

  // --- Google ---
  {
    match: 'Google-CloudVertexBot',
    product: 'Google-CloudVertexBot',
    purpose: 'training',
  },
  {
    match: 'Google-Extended',
    product: 'Google-Extended',
    purpose: 'training',
  },

  // --- Apple ---
  {
    match: 'Applebot-Extended',
    product: 'Applebot-Extended',
    purpose: 'training',
  },

  // --- Amazon ---
  { match: 'Amazonbot', product: 'Amazonbot', purpose: 'training' },

  // --- DuckDuckGo ---
  {
    match: 'DuckAssistBot',
    product: 'DuckAssistBot',
    purpose: 'user-action',
  },

  // --- ByteDance ---
  { match: 'Bytespider', product: 'Bytespider', purpose: 'training' },

  // --- Common Crawl ---
  { match: 'CCBot', product: 'CCBot', purpose: 'training' },
];
