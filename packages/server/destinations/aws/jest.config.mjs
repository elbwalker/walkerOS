import baseConfig from '@walkeros/config/jest';

const config = {
  // The SDK loads `node:http` (for plain-http endpoints) and the default
  // credential providers through dynamic `import()`, which Jest's CommonJS
  // runtime rejects. The real-SDK test talks to a fake AWS on
  // http://127.0.0.1 and runs the default chain, so those modules are
  // transformed, turning each import into a `require`.
  transformIgnorePatterns: [
    '/node_modules/(?!(@walkeros|@smithy/node-http-handler|@aws-sdk/credential-provider-[a-z-]+|@aws-sdk/token-providers)/)',
  ],
};

export default { ...baseConfig, ...config };
