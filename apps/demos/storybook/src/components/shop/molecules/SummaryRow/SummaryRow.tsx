import { Price } from '../../atoms/Price';
import { Text } from '../../atoms/Text';
import type { SummaryLine } from '../../data';
import { propertyProps } from '../../tagging';

export interface SummaryRowProps {
  /** The entity the amount is a property of. */
  entity: string;
  line: SummaryLine;
}

export const SummaryRow = ({ entity, line }: SummaryRowProps) => {
  const { label, property, amount, currency, emphasis } = line;
  const variant = emphasis ? 'body' : 'ui';

  return (
    <div
      className={`flex items-center justify-between ${emphasis ? 'border-t border-border pt-6' : ''}`}
    >
      <Text
        as="dt"
        variant={variant}
        tone={emphasis ? 'fg' : 'fg-2'}
        className={emphasis ? 'font-semibold' : 'font-normal'}
      >
        {label}
      </Text>
      <Price
        as="dd"
        amount={amount}
        fractionDigits={2}
        variant={variant}
        className="font-semibold"
        {...propertyProps(entity, {
          [property]: amount,
          ...(currency ? { currency } : {}),
        })}
      />
    </div>
  );
};
