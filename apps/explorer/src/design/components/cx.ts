/** Joins the truthy class names with spaces. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter((name): name is string => Boolean(name)).join(' ');
}
