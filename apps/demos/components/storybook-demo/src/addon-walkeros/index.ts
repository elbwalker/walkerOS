export const managerEntries = (entry: any[] = []) => [
  ...entry,
  require.resolve('./manager'),
];