import { c as tarCreate } from 'tar';

/**
 * Pack a node-platform bundle directory into a gzip tarball.
 *
 * The directory is expected to be shaped like `runNftServerPath` leaves it:
 * `flow.mjs` (the factory), an optional sibling `node_modules/`, and
 * `package.json`. Entries are added relative to `dir` (`cwd`), so the resulting
 * archive holds them at its root with no absolute paths.
 *
 * The caller passes the exact `entries` to pack (relative to `dir`). The
 * caller is responsible for filtering to entries that exist on disk: when a
 * flow's deps are fully inlined by esbuild, no `node_modules/` is emitted and
 * `tar.c` would otherwise throw `ENOENT` on the missing path.
 *
 * @param dir - Directory containing the bundle artifacts to pack.
 * @param outFile - Destination `.tar.gz`/`.tgz` path for the gzip tarball.
 * @param entries - Relative entries to include (e.g. `flow.mjs`, `package.json`).
 */
export async function packBundleDir(
  dir: string,
  outFile: string,
  entries: string[],
): Promise<void> {
  await tarCreate({ gzip: true, cwd: dir, file: outFile }, entries);
}
