module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  moduleFileExtensions: ['js', 'ts', 'd.ts'],
  rootDir: 'src',
  moduleDirectories: ['node_modules', 'src'],
};
