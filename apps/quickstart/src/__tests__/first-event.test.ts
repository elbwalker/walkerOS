import { firstEvent } from '../first-event';

describe('first-event', () => {
  it('delivers a page view event to the inline console destination', async () => {
    const seen = await firstEvent();
    expect(seen).toEqual(['page view']);
  });
});
