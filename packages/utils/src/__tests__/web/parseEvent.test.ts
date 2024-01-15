import { parseEvent } from '../..';

describe('Utils parseEvent', () => {
  test('parseEvent', () => {
    const obj = {
      event: 'e a',
      data: { id: '123', price: 9.99 },
      globals: { lang: 'en' },
    };
    const decoded =
      '?event=e%20a&data={"id":"123","price":9.99}&globals={"lang":"en"}';
    const encoded =
      'event=e%20a&data=%7B%22id%22%3A%22123%22%2C%22price%22%3A9.99%7D&globals=%7B%22lang%22%3A%22en%22%7D';

    expect(parseEvent({})).toBeFalsy();
    expect(
      parseEvent({
        obj: { foo: 'bar' },
        str: 'data={"missing":"event"}',
      }),
    ).toBeFalsy();
    expect(parseEvent({ str: decoded })).toStrictEqual(obj);
    expect(parseEvent({ str: encoded })).toStrictEqual(obj);
    expect(parseEvent({ obj })).toStrictEqual(obj);
    expect(
      parseEvent({
        obj: { event: 'e a', data: { override: 'me' } },
        str: 'data={"id":"123","price":9.99}&globals={"lang":"en"}',
      }),
    ).toStrictEqual(obj);
    // expect(
    //   parseEvent({
    //     obj: { event: 'e a', ignore: 'me' },
    //     str: 'bad parameter',
    //   }),
    // ).toStrictEqual({ event: 'e a' });
  });
});
