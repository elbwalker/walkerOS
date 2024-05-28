interface Assign {
  merge?: boolean; // Merge array properties (default) instead of overriding them
  shallow?: boolean; // Create a shallow copy (default) instead of updating the target object
  extend?: boolean; // Extend the target with new properties (default) instead of only updating existing ones
}

const defaultOptions: Assign = {
  merge: true,
  shallow: true,
  extend: true,
};

export function assign<T extends object, U extends object>(
  target: T,
  obj: U = {} as U,
  options: Assign = {},
): T & U {
  options = { ...defaultOptions, ...options };

  const finalObj = Object.entries(obj).reduce((acc, [key, sourceProp]) => {
    const targetProp = target[key as keyof typeof target];

    // Only merge arrays
    if (
      options.merge &&
      Array.isArray(targetProp) &&
      Array.isArray(sourceProp)
    ) {
      acc[key as keyof typeof acc] = sourceProp.reduce(
        (acc, item) => {
          // Remove duplicates
          return acc.includes(item) ? acc : [...acc, item];
        },
        [...targetProp],
      );
    } else if (options.extend || key in target) {
      // Extend the target with new properties or update existing ones
      acc[key as keyof typeof acc] = sourceProp;
    }

    return acc;
  }, {} as U);

  // Handle shallow or deep copy based on options
  if (options.shallow) {
    return { ...target, ...finalObj };
  } else {
    Object.assign(target, finalObj);
    return target as T & U;
  }
}
