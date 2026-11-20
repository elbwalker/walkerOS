import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createReleaseCache } from '../../remote/cache.js';
import { sha256Hex } from '../../remote/release-document.js';
import { servedTarget } from '../../remote/served.js';
import { createMockLogger } from '../helpers/mock-logger.js';
import { refusalOf } from '../helpers/supervisor-harness.js';

let root: string;
/** The release folder a served path lands in. */
let folder: string;
/** A folder beside it that nothing may write through a link. */
let outside: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'walkeros-served-test-'));
  folder = join(root, 'releases', '17');
  outside = join(root, 'outside');
  mkdirSync(folder, { recursive: true });
  mkdirSync(outside);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('servedTarget', () => {
  it('makes each missing folder of the path and answers the target', async () => {
    expect(await servedTarget(folder, 'casamoda/js/walker.js')).toBe(
      join(folder, 'casamoda', 'js', 'walker.js'),
    );
    expect(lstatSync(join(folder, 'casamoda', 'js')).isDirectory()).toBe(true);
    expect(existsSync(join(folder, 'casamoda', 'js', 'walker.js'))).toBe(false);
  });

  it('answers a target in a folder the archive holds, its file left as it is', async () => {
    mkdirSync(join(folder, 'casamoda'));
    writeFileSync(join(folder, 'casamoda', 'walker.js'), 'v4');

    expect(await servedTarget(folder, 'casamoda/walker.js')).toBe(
      join(folder, 'casamoda', 'walker.js'),
    );
    expect(readFileSync(join(folder, 'casamoda', 'walker.js'), 'utf8')).toBe(
      'v4',
    );
  });

  it('answers a file at the root of the folder', async () => {
    expect(await servedTarget(folder, 'walker.js')).toBe(
      join(folder, 'walker.js'),
    );
  });

  it.each<[string, () => void, string]>([
    [
      'a folder that is a link to a folder outside',
      () => symlinkSync(outside, join(folder, 'casamoda'), 'dir'),
      'casamoda/js/walker.js',
    ],
    [
      'a folder that is a file',
      () => writeFileSync(join(folder, 'casamoda'), 'x'),
      'casamoda/walker.js',
    ],
    [
      'a target that is a folder',
      () =>
        mkdirSync(join(folder, 'casamoda', 'walker.js'), { recursive: true }),
      'casamoda/walker.js',
    ],
    ['a path core does not take', () => undefined, '../outside/walker.js'],
  ])(
    'refuses %s as archive-entry and makes nothing through it',
    async (_case, arrange, path) => {
      arrange();

      const refusal = await refusalOf(servedTarget(folder, path));

      expect([refusal.check, refusal.sequence]).toEqual([
        'archive-entry',
        undefined,
      ]);
      expect(readdirSync(outside)).toEqual([]);
    },
  );

  it('answers a target that is a link, and placing there replaces the link, never its file', async () => {
    const script = new TextEncoder().encode('window.walker = "v5";\n');
    const file = { sha256: sha256Hex(script), bytes: script.byteLength };
    const cache = await createReleaseCache(
      join(root, 'cache'),
      createMockLogger(),
    );
    async function* chunks(): AsyncGenerator<Uint8Array> {
      yield script;
    }
    await cache.storeArtifact(chunks(), file, 'file');
    const linked = join(outside, 'kept.js');
    writeFileSync(linked, 'kept');
    mkdirSync(join(folder, 'casamoda'));
    symlinkSync(linked, join(folder, 'casamoda', 'walker.js'));

    const target = await servedTarget(folder, 'casamoda/walker.js');
    await cache.placeFile(file, target);

    expect(target).toBe(join(folder, 'casamoda', 'walker.js'));
    expect(lstatSync(target).isFile()).toBe(true);
    expect(new Uint8Array(readFileSync(target))).toEqual(script);
    expect(readFileSync(linked, 'utf8')).toBe('kept');
  });
});
