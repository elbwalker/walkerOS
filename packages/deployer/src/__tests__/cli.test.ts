import { execSync } from 'child_process';

describe('CLI', () => {
  it('should output moin when executed', () => {
    const output = execSync('tsx src/index.ts', {
      cwd: __dirname + '/../..',
      encoding: 'utf8',
    });

    expect(output.trim()).toBe('moin');
  });
});
