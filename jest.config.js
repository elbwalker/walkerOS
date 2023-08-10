module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        diagnostics: true,
      },
    ],
  },
  moduleFileExtensions: ['js', 'ts', 'd.ts'],
  rootDir: 'src',
  moduleDirectories: ['node_modules', 'src'],
};
