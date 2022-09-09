import Elbwalker from '../elbwalker';
import { IElbwalker } from '../types';
import fs from 'fs';

describe('Init', () => {
  const w = window;
  let elbwalker: IElbwalker.Function;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('custom prefix', () => {
    const prefix = 'data-prefix';
    elbwalker = Elbwalker({ prefix });

    expect(elbwalker.config).toStrictEqual(
      expect.objectContaining({
        prefix: prefix,
      }),
    );
  });
});
