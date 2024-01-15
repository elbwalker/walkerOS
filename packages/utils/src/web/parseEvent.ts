import { WalkerOS } from '@elbwalker/types';
import { assign, tryCatch } from '..';

export function parseEvent(input: {
  obj?: WalkerOS.AnyObject;
  str?: string;
}): false | WalkerOS.PartialEvent {
  const { obj, str } = input;
  if (!obj && !str) return false;

  let result: WalkerOS.AnyObject = {};

  if (str) {
    const cleanedStr = str.startsWith('?') ? str.substring(1) : str;
    const pairs = cleanedStr.split('&');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      const decodedValue = decodeURIComponent(value);
      result[key] = tryCatch(
        (value: string) => JSON.parse(value),
        () => decodedValue,
      )(decodedValue);
    }
  }

  result = assign(obj || {}, result);

  const event: WalkerOS.PartialEvent = result;

  // TODO only map allowed properties

  // Check for required property 'event'
  if (!event.event) return false;

  return event;
}
