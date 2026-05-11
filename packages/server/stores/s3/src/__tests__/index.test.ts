jest.mock('s3mini', () => ({
  S3mini: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn(),
    createBucket: jest.fn(),
    getObjectArrayBuffer: jest.fn(),
    putObject: jest.fn(),
    deleteObject: jest.fn(),
  })),
}));

import storeS3, { storeS3Init, setup } from '../';

describe('@walkeros/server-store-s3 default export', () => {
  it('carries type, init, and setup', () => {
    expect(storeS3.type).toBe('s3');
    expect(storeS3.init).toBe(storeS3Init);
    expect(storeS3.setup).toBe(setup);
  });
});
