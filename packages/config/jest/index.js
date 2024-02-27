module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        diagnostics: true,
      },
    ],
  },
   testMatch: ['<rootDir>/**/*.test.(ts|tsx|js|jsx)'],
  moduleFileExtensions: ['js', 'ts', 'd.ts'],
  rootDir: 'src',
  moduleDirectories: ['node_modules', 'src'],
};
