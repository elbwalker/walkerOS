// Pure link-rewriting logic shared by the skills-doc generator and its tests.
//
// SKILL.md files live at skills/<skillName>/SKILL.md and cross-link the repo
// with relative paths. When those files are surfaced as website pages under
// /skills, every link target must become either an in-site route the
// Docusaurus router knows (so onBrokenLinks: 'throw' stays happy) or an
// absolute GitHub URL for files that have no website page.

const REPO_BLOB = 'https://github.com/elbwalker/walkerOS/blob/main';

const EXTERNAL_PREFIXES = ['http://', 'https://', 'mailto:', '//'];

// Resolve a POSIX-style relative path (with ./ and ../ segments) against a
// base directory, both expressed relative to the repo root. Returns a
// repo-root-relative path with no leading slash and no ./ or ../ left.
function resolveRepoPath(baseDir, target) {
  const baseSegments = baseDir.split('/').filter(Boolean);
  const targetSegments = target.split('/');
  const stack = [...baseSegments];

  for (const segment of targetSegments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  return stack.join('/');
}

function isExternal(target) {
  return EXTERNAL_PREFIXES.some((prefix) => target.startsWith(prefix));
}

/**
 * Rewrite a single markdown link target found inside skills/<skillName>/SKILL.md.
 *
 * @param {string} target   The raw link target (may include a #anchor).
 * @param {string} skillName The owning skill directory name (e.g. "walkeros-using-cli").
 * @returns {{ href: string, drop?: boolean }} The rewritten target. When
 *   `drop` is true the caller should strip the link entirely and render the
 *   link text as inline code (the target is a placeholder, not a real route).
 */
export function rewriteLink(target, skillName) {
  const trimmed = target.trim();

  // External links and pure in-page anchors pass through untouched.
  if (isExternal(trimmed)) return { href: trimmed };
  if (trimmed.startsWith('#')) return { href: trimmed };

  // Split off an #anchor so path matching is clean; re-append where noted.
  const hashIndex = trimmed.indexOf('#');
  const path = hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? '' : trimmed.slice(hashIndex); // includes '#'

  // Cross-skill link: ../walkeros-<x>/SKILL.md -> /skills/walkeros-<x>
  const crossSkill = path.match(/^\.\.\/(walkeros-[^/]+)\/SKILL\.md$/);
  if (crossSkill) {
    return { href: `/skills/${crossSkill[1]}${anchor}` };
  }

  // Website docs: ../../website/docs/<path>.(mdx|md) -> /docs/<path>
  // Docusaurus serves an `index` doc at its directory route (index.mdx ->
  // /docs/<dir>/), so strip a trailing `/index` (or a bare `index`).
  const websiteDocs = path.match(/^\.\.\/\.\.\/website\/docs\/(.+)\.(mdx|md)$/);
  if (websiteDocs) {
    let docPath = websiteDocs[1];
    if (docPath === 'index') {
      docPath = '';
    } else if (docPath.endsWith('/index')) {
      docPath = docPath.slice(0, -'/index'.length) + '/';
    }
    return { href: `/docs/${docPath}${anchor}` };
  }

  // Already-absolute in-site routes: /docs/... or /skills/...
  if (path.startsWith('/docs/') || path.startsWith('/skills/')) {
    // A placeholder ellipsis is not a real route. Strip the link so
    // onBrokenLinks can't trip; the caller renders the text as inline code.
    if (path.includes('...')) {
      return { href: trimmed, drop: true };
    }
    return { href: `${path}${anchor}` };
  }

  // Everything else is a repo-relative file with no website page:
  //   ../../packages/...  -> two levels up from skills/<skillName> = repo root
  //   ./examples/...      -> sibling of SKILL.md
  //   bare-sibling x.md   -> sibling of SKILL.md
  // Resolving every form against skills/<skillName>/ yields the correct
  // repo-root-relative path in all cases. They become GitHub blob URLs.
  // Code/line anchors are dropped (they don't map to a stable GitHub fragment).
  const repoPath = resolveRepoPath(`skills/${skillName}`, path);
  return { href: `${REPO_BLOB}/${repoPath}` };
}
