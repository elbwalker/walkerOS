import { trackWithWalkerSources } from '../walkerjs/with-sources';

describe('Walker.js with Sources', () => {
  it('tracks events without errors', async () => {
    const mockElb = jest.fn();
    await expect(trackWithWalkerSources(mockElb)).resolves.not.toThrow();
    expect(mockElb).toHaveBeenCalled();
  });
});
