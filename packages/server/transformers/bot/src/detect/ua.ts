import { isbot } from 'isbot';
import { agents, type AgentEntry } from '../data/agents';

export interface UAResult {
  isBot: boolean;
  agent?: { product: string; purpose: AgentEntry['purpose'] };
}

export function detectUA(ua: string): UAResult {
  const lower = ua.toLowerCase();
  const matched = agents.find((a) => lower.includes(a.match.toLowerCase()));
  return {
    isBot: !ua || isbot(ua) || matched !== undefined,
    agent: matched
      ? { product: matched.product, purpose: matched.purpose }
      : undefined,
  };
}
