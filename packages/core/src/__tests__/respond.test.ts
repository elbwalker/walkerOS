import { createRespond } from '../respond';

describe('createRespond', () => {
  it('calls sender with options', () => {
    const sender = jest.fn();
    const respond = createRespond(sender);
    respond({ body: 'hello', status: 200 });
    expect(sender).toHaveBeenCalledWith({ body: 'hello', status: 200 });
  });

  it('is idempotent — first call wins', () => {
    const sender = jest.fn();
    const respond = createRespond(sender);
    respond({ body: 'first' });
    respond({ body: 'second' });
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender).toHaveBeenCalledWith({ body: 'first' });
  });

  it('defaults to empty options', () => {
    const sender = jest.fn();
    const respond = createRespond(sender);
    respond();
    expect(sender).toHaveBeenCalledWith({});
  });
});
