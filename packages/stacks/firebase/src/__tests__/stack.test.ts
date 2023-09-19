import { deploy } from '../deploy';
import { exec } from 'child_process';

jest.mock('child_process', () => ({
  exec: jest.fn((command, callback) => {
    callback(null);
  }),
}));

describe('Firebase Stack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('deploy', async () => {
    await deploy('./__mocks__/basic.ts');

    expect(exec).toHaveBeenCalledWith(
      'firebase deploy --only functions',
      expect.any(Function),
    );
  });
});
