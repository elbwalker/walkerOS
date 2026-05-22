import { detectUA } from '../detect/ua';

describe('detectUA', () => {
  test('empty UA returns isBot true, no agent', () => {
    expect(detectUA('')).toEqual({ isBot: true, agent: undefined });
  });

  test('plain Chrome returns isBot false, no agent', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    expect(detectUA(ua)).toEqual({ isBot: false, agent: undefined });
  });

  test('curl is caught by isbot', () => {
    expect(detectUA('curl/8.4.0').isBot).toBe(true);
  });

  test('GPTBot matches training-purpose agent', () => {
    const ua =
      'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)';
    expect(detectUA(ua).agent).toEqual({
      product: 'GPTBot',
      purpose: 'training',
    });
  });

  test('ChatGPT-User matches user-action agent', () => {
    const ua =
      'Mozilla/5.0 AppleWebKit/537.36; compatible; ChatGPT-User/1.0; +https://openai.com/bot';
    expect(detectUA(ua).agent).toEqual({
      product: 'ChatGPT-User',
      purpose: 'user-action',
    });
  });

  test('Claude-SearchBot matches before Claude-User (order specificity)', () => {
    expect(
      detectUA('Mozilla/5.0 (compatible; Claude-SearchBot/1.0)').agent?.product,
    ).toBe('Claude-SearchBot');
  });

  test('Claude-User matches before ClaudeBot', () => {
    expect(
      detectUA('Mozilla/5.0 (compatible; Claude-User/1.0)').agent?.product,
    ).toBe('Claude-User');
  });

  test('Google-Extended matches as training', () => {
    expect(detectUA('Mozilla/5.0 (compatible; Google-Extended)').agent).toEqual(
      { product: 'Google-Extended', purpose: 'training' },
    );
  });

  test('ChatGPT-Agent matches as user-action', () => {
    expect(
      detectUA('Mozilla/5.0 (compatible; ChatGPT-Agent/1.0)').agent,
    ).toEqual({ product: 'ChatGPT-Agent', purpose: 'user-action' });
  });

  test('matching is case-insensitive', () => {
    expect(detectUA('gptbot/1.0').agent?.product).toBe('GPTBot');
  });
});
