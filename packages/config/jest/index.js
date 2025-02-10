const config = {
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
        },
        module: {
          type: 'es6',
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@elbwalker)/)'],
  testMatch: ['<rootDir>/**/*.test.(ts|tsx|js|jsx)'],
  moduleFileExtensions: ['js', 'ts', 'mjs'],
  rootDir: 'src',
  moduleDirectories: ['node_modules', 'src'],
  // extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // moduleNameMapper: {
  //   '^@elbwalker/(.*)$': '<rootDir>/../../../$1/src',
  // },
  // moduleNameMapper: {
  //   '^@elbwalker/(.*)$': '<rootDir>/../../../$1/',
  // },
  // transformIgnorePatterns: [
  //   '/node_modules/(?!(@elbwalker)/)',
  // ],
};

export default config;
