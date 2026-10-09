import { Link } from '../../../../shared/atoms/Link';
import { Text } from '../../../../shared/atoms/Text';
import { useText } from '../../../../shared/language';
import type { Labelled } from '../../data';
import { propertyProps } from '../../tagging';

const headings = { 3: 'h3', 4: 'h4' } satisfies Record<3 | 4, 'h3' | 'h4'>;

export interface ProductFactsProps {
  name: string;
  color: Labelled;
  size: Labelled;
  /** Heading level of the product name. */
  level?: 3 | 4;
  className?: string;
}

/** A product's name, colour and size, each tagged as a `product` property. */
export const ProductFacts = ({
  name,
  color,
  size,
  level = 3,
  className = '',
}: ProductFactsProps) => {
  const NameHeading = headings[level];
  const t = useText();

  return (
    <div className={`space-y-1 ${className}`}>
      <NameHeading className="text-ui">
        <Link {...propertyProps('product', { name })}>{t(name)}</Link>
      </NameHeading>
      <Text
        variant="small"
        className="font-normal"
        {...propertyProps('product', { color: color.value })}
      >
        {t(color.label)}
      </Text>
      <Text
        variant="small"
        className="font-normal"
        {...propertyProps('product', { size: size.value })}
      >
        {t(size.label)}
      </Text>
    </div>
  );
};
