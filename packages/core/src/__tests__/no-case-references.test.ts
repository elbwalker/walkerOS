import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !/no-case-references/.test(p))
      out.push(p);
  }
  return out;
}

function findOffenders(root: string): { file: string; pattern: string }[] {
  const offenders: { file: string; pattern: string }[] = [];
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    if (/['"]case['"]\s*:\s*\[/.test(src)) {
      offenders.push({ file, pattern: 'case: [' });
    }
    if (/\bRouteCaseConfig\b/.test(src)) {
      offenders.push({ file, pattern: 'RouteCaseConfig' });
    }
  }
  return offenders;
}

describe('no `case` route operator references in package source', () => {
  const coreSrc = join(__dirname, '..');
  // Resolve sibling packages relative to core/src/__tests__.
  const collectorSrc = join(coreSrc, '..', '..', 'collector', 'src');
  const cliSrc = join(coreSrc, '..', '..', 'cli', 'src');

  it('finds zero offenders across core/src', () => {
    expect(findOffenders(coreSrc)).toEqual([]);
  });

  it('finds zero offenders across collector/src', () => {
    if (!existsSync(collectorSrc)) return;
    expect(findOffenders(collectorSrc)).toEqual([]);
  });

  it('finds zero offenders across cli/src', () => {
    if (!existsSync(cliSrc)) return;
    expect(findOffenders(cliSrc)).toEqual([]);
  });
});
