import { detectUA } from './ua';

export interface ScoreResult {
  /** 0-99, higher = more bot. v1 emits discrete values: 0, 70, 80, 90, 95. */
  botScore: number;
  /**
   * 0-99, higher = more likely an AI agent. v1 emits only 0 or 95
   * (binary UA-map match). Graduated values (e.g. 70 for unverified UA
   * claim, 99 for IP-reverse-DNS verified) are planned for v1.1.
   */
  agentScore: number;
  /** Matched AI agent UA substring, when one was found. */
  agentProduct?: string;
}

/**
 * v1: UA-only.
 *
 * botScore baseline:
 *   - Empty UA            → 70 (real browsers rarely strip UA)
 *   - AI training crawler → 95
 *   - AI user-action      → 90
 *   - isbot true          → 80
 *   - Otherwise           → 0
 *
 * Header heuristics (Sec-Fetch missing, Sec-CH-UA major mismatch,
 * Accept-Language stripping) are intentionally deferred to v1.1 —
 * see the README "Not in v1" section and the research file.
 */
export function computeScore(ua: string): ScoreResult {
  if (!ua) {
    return { botScore: 70, agentScore: 0, agentProduct: undefined };
  }

  const uaResult = detectUA(ua);

  let botScore = 0;
  if (uaResult.agent) {
    botScore = uaResult.agent.purpose === 'user-action' ? 90 : 95;
  } else if (uaResult.isBot) {
    botScore = 80;
  }

  return {
    botScore,
    agentScore: uaResult.agent ? 95 : 0,
    agentProduct: uaResult.agent?.product,
  };
}
