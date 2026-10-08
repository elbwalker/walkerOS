import { Text, type TextProps } from '../Text';

/** Euro amount as the shop shows it: whole amounts plain, cents with two digits. */
export function formatPrice(amount: number, fractionDigits?: 0 | 2): string {
  const digits = fractionDigits ?? (Number.isInteger(amount) ? 0 : 2);
  return `€${amount.toFixed(digits)}`;
}

export interface PriceProps extends Omit<TextProps, 'children'> {
  amount: number;
  fractionDigits?: 0 | 2;
}

export const Price = ({
  amount,
  fractionDigits,
  as = 'p',
  variant = 'ui',
  tone = 'fg',
  ...rest
}: PriceProps) => (
  <Text as={as} variant={variant} tone={tone} {...rest}>
    {formatPrice(amount, fractionDigits)}
  </Text>
);
