export const managerEntries = (entry: any[] = []) => [
  ...entry,
  require.resolve('./manager.tsx'),
];

export const previewEntries = (entry: any[] = []) => [
  ...entry,
  require.resolve('./preview'),
];