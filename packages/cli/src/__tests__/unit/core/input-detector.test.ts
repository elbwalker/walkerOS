import { detectInput } from '../../../core/input-detector.js';

describe('detectInput', () => {
  it('detects inline JSON object as config', async () => {
    const json = '{"version":3,"flows":{"default":{"web":{}}}}';
    const result = await detectInput(json);
    expect(result.type).toBe('config');
    expect(result.content).toBe(json);
  });

  it('detects inline JSON array as config', async () => {
    const json = '[{"name":"test"}]';
    const result = await detectInput(json);
    expect(result.type).toBe('config');
    expect(result.content).toBe(json);
  });

  it('detects inline JSON with leading whitespace as config', async () => {
    const json = '  {"version":3}';
    const result = await detectInput(json);
    expect(result.type).toBe('config');
    expect(JSON.parse(result.content)).toEqual({ version: 3 });
  });

  it('throws for non-existent file path', async () => {
    await expect(detectInput('/tmp/does-not-exist-xyz.json')).rejects.toThrow();
  });
});
