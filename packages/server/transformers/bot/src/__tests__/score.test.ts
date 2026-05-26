import { computeScore } from '../detect/score';

describe('computeScore', () => {
  test('real Chrome → botScore 0, agentScore 0', () => {
    expect(
      computeScore(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ),
    ).toEqual({ botScore: 0, agentScore: 0, agentProduct: undefined });
  });

  test('GPTBot UA → botScore 95, agentScore 95, agentProduct GPTBot', () => {
    expect(computeScore('Mozilla/5.0 (compatible; GPTBot/1.2)')).toEqual({
      botScore: 95,
      agentScore: 95,
      agentProduct: 'GPTBot',
    });
  });

  test('ChatGPT-User → botScore 90, agentScore 95, agentProduct ChatGPT-User', () => {
    expect(
      computeScore(
        'Mozilla/5.0 AppleWebKit/537.36; compatible; ChatGPT-User/1.0',
      ),
    ).toEqual({
      botScore: 90,
      agentScore: 95,
      agentProduct: 'ChatGPT-User',
    });
  });

  test('Claude-SearchBot → botScore 95 (treated as crawler), agentScore 95', () => {
    expect(
      computeScore('Mozilla/5.0 (compatible; Claude-SearchBot/1.0)').botScore,
    ).toBe(95);
  });

  test('curl → botScore 80, agentScore 0', () => {
    expect(computeScore('curl/8.4.0')).toEqual({
      botScore: 80,
      agentScore: 0,
      agentProduct: undefined,
    });
  });

  test('empty UA → botScore 70, agentScore 0', () => {
    expect(computeScore('')).toEqual({
      botScore: 70,
      agentScore: 0,
      agentProduct: undefined,
    });
  });

  test('botScore never exceeds 99', () => {
    expect(computeScore('GPTBot').botScore).toBeLessThanOrEqual(99);
  });
});
