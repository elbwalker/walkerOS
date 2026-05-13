import { readFileSync } from 'fs';
import { join } from 'path';

describe('MCP instructions reference one/many, not case', () => {
  it('instructions.ts uses one/many keywords', () => {
    const src = readFileSync(join(__dirname, '..', 'instructions.ts'), 'utf8');
    expect(src).not.toMatch(/['"]case['"]\s*:\s*\[/);
    expect(src).toMatch(/\bone\b/);
    expect(src).toMatch(/\bmany\b/);
  });

  it('add-step prompt uses one/many keywords', () => {
    const src = readFileSync(
      join(__dirname, '..', 'prompts', 'add-step.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/['"]case['"]\s*:\s*\[/);
    expect(src).toMatch(/\bone\b/);
  });
});
