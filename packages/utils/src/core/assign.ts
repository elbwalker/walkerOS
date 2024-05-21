import { WalkerOS } from '@elbwalker/types';

interface Assign {
  merge?: boolean;
}

export function assign<T>(
  target: T,
  source: WalkerOS.AnyObject = {},
  options: Assign = { merge: true },
): T {
  // Check for array properties to merge them before overriding
  Object.entries(source).forEach(([key, sourceProp]) => {
    const targetProp = target[key as keyof typeof target];

    // Only merge arrays
    if (
      options.merge &&
      Array.isArray(targetProp) &&
      Array.isArray(sourceProp)
    ) {
      source[key as keyof typeof source] = sourceProp.reduce(
        (acc, item) => {
          // Remove duplicates
          return acc.includes(item) ? acc : [...acc, item];
        },
        [...targetProp],
      );
    }
  });

  return { ...target, ...source };
}
