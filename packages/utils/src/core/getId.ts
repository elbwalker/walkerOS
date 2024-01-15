export function getId(length = 6): string {
  for (var str = '', l = 36; str.length < length; )
    str += ((Math.random() * l) | 0).toString(l);
  return str;
}
