import type { HTMLAttributes } from 'react';
import { Icon } from '../Icon';

export interface StarRatingProps extends HTMLAttributes<HTMLDivElement> {
  rating: number;
  max?: number;
}

export const StarRating = ({
  rating,
  max = 5,
  className = '',
  ...rest
}: StarRatingProps) => (
  <div className={`flex items-center ${className}`} {...rest}>
    {Array.from({ length: max }, (_, index) => (
      <Icon
        key={index}
        name="star"
        className={`size-5 ${index < rating ? 'text-fg' : 'text-fg-3'}`}
      />
    ))}
    <span className="sr-only">
      {rating} out of {max} stars
    </span>
  </div>
);
