export function clone<T>(org: T): T {
  if (typeof org !== 'object' || org === null) return org;

  if (Array.isArray(org)) return org.map((item) => clone(item)) as unknown as T;

  const clonedObj = {} as T;
  for (const key in org) {
    if (Object.prototype.hasOwnProperty.call(org, key)) {
      clonedObj[key] = clone(org[key]);
    }
  }

  return clonedObj;
}
