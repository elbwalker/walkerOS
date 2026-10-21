import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { serializeStoreValue } from '@walkeros/core/node';
import { storeFsInit } from '..';
import { examples, schemas } from '../dev';
import type { FsStoreEnv } from '../types';

/**
 * File operations without a disk, as the kit's boundary: every read answers
 * one stored value, writes and deletes resolve. It lives here, not in the
 * package's dev examples: a simulation runs the fs store on the real file
 * system, as configured.
 */
const push: FsStoreEnv = {
  fs: {
    readFile: async () => serializeStoreValue({ stored: true }),
    writeFile: async () => undefined,
    mkdir: async () => undefined,
    unlink: async () => undefined,
  },
};
const simulation = ['fs.readFile', 'fs.writeFile', 'fs.mkdir', 'fs.unlink'];

describe('fs store conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('store', storeFsInit, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      settings: { basePath: './state' },
      env: { push, simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
