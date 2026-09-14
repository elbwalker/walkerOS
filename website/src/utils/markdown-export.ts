/**
 * Resolves the Markdown companion of a doc route.
 *
 * The LLM export writes one `.md` file per doc route, mirroring the route path
 * with any trailing slash removed: `/docs/` is written to `/docs.md` and
 * `/docs/mapping/` to `/docs/mapping.md`. Only routes rendered as a doc item
 * have one. Generated category indexes and client-redirect stubs are separate
 * route types and carry no export, so never derive a link for them.
 */

/** Path of the Markdown companion, e.g. `/docs/mapping.md`. */
export function markdownExportPath(permalink: string): string {
  const withoutTrailingSlash = permalink.replace(/\/+$/, '');
  return `${withoutTrailingSlash || '/index'}.md`;
}

/**
 * Fully qualified URL of the Markdown companion. The permalink already carries
 * the baseUrl, so the site url contributes the origin only.
 */
export function markdownExportUrl(siteUrl: string, permalink: string): string {
  return `${siteUrl.replace(/\/+$/, '')}${markdownExportPath(permalink)}`;
}
