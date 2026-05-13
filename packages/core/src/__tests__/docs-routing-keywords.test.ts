import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DOCS_ROOT = '/workspaces/developer/walkerOS/website/docs';

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(md|mdx)$/.test(p)) out.push(p);
  }
  return out;
}

// Build the legacy type-name regex dynamically so this guard test file does
// not itself contain the literal token that the package-source grep-guard
// (`no-case-references.test.ts`) flags as an offender.
const LEGACY_TYPE = ['Route', 'Case', 'Config'].join('');
const legacyOpRegex = /['"`]case['"`]\s*:\s*\[/;
const legacyTypeRegex = new RegExp(`\\b${LEGACY_TYPE}\\b`);
const offenderMatchRegex = new RegExp(
  `['"\`]case['"\`]\\s*:\\s*\\[|${LEGACY_TYPE}`,
);

describe('website docs reference one/many, not case', () => {
  it('no docs file references the `case` route operator', () => {
    const offenders: { file: string; pattern: string }[] = [];
    for (const file of walk(DOCS_ROOT)) {
      const src = readFileSync(file, 'utf8');
      if (legacyOpRegex.test(src) || legacyTypeRegex.test(src)) {
        offenders.push({
          file,
          pattern: src.match(offenderMatchRegex)?.[0] ?? 'unknown',
        });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('at least one docs file documents the `one` operator', () => {
    let foundOne = false;
    for (const file of walk(DOCS_ROOT)) {
      const src = readFileSync(file, 'utf8');
      if (/`one`/.test(src)) {
        foundOne = true;
        break;
      }
    }
    expect(foundOne).toBe(true);
  });

  it('at least one docs file documents the `many` operator', () => {
    let foundMany = false;
    for (const file of walk(DOCS_ROOT)) {
      const src = readFileSync(file, 'utf8');
      if (/`many`/.test(src)) {
        foundMany = true;
        break;
      }
    }
    expect(foundMany).toBe(true);
  });
});
