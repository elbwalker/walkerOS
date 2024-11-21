export function clone<T>(org: T): T {
  // Handle primitive values and functions directly
  if (typeof org !== 'object' || org === null) return org;

  // Allow list of clonable types
  const type = Object.prototype.toString.call(org);

  if (type === '[object Object]') {
    // Clone plain object
    const clonedObj = {} as T;
    for (const key in org) {
      if (Object.prototype.hasOwnProperty.call(org, key)) {
        clonedObj[key] = clone(org[key]);
      }
    }
    return clonedObj;
  }

  if (type === '[object Array]') {
    // Clone array
    return (org as unknown as Array<unknown>).map((item) =>
      clone(item),
    ) as unknown as T;
  }

  if (type === '[object Date]') {
    // Clone date
    return new Date((org as unknown as Date).getTime()) as unknown as T;
  }

  if (type === '[object RegExp]') {
    // Clone regular expression
    const reg = org as unknown as RegExp;
    return new RegExp(reg.source, reg.flags) as unknown as T;
  }

  // Skip cloning for non-allowed types and return reference
  return org;
}
