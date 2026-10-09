import { PhotoPlaceholder } from '@walkeros/explorer/design/components';
import { useText } from '../../../../shared/language';

export interface ProductImageProps {
  /** Names the image when `alt` is missing. */
  name: string;
  alt?: string;
  aspect?: 'square' | 'wide';
  className?: string;
}

/** An offline image placeholder: stripes where the product photo would go. */
export const ProductImage = ({
  name,
  alt,
  aspect = 'square',
  className = '',
}: ProductImageProps) => {
  const t = useText();
  return (
    <div
      role="img"
      aria-label={t(alt ?? name)}
      className={`flex overflow-hidden rounded-lg ${aspect === 'wide' ? 'aspect-video' : 'aspect-square'} ${className}`}
    >
      <PhotoPlaceholder className="flex-1" />
    </div>
  );
};
