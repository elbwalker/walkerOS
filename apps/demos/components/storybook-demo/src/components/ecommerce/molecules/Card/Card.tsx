import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import './Card.css';

export interface CardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card = ({
  title,
  description,
  imageUrl,
  actionLabel,
  onAction,
  variant = 'default',
}: CardProps) => {
  return (
    <div className={`storybook-card storybook-card--${variant}`}>
      {imageUrl && (
        <div className="storybook-card__image">
          <img src={imageUrl} alt={title} />
        </div>
      )}
      <div className="storybook-card__content">
        <Typography variant="h4" className="storybook-card__title">
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            color="secondary"
            className="storybook-card__description"
          >
            {description}
          </Typography>
        )}
        {actionLabel && onAction && (
          <div className="storybook-card__actions">
            <Button
              label={actionLabel}
              onClick={onAction}
              size="small"
              elbAction="add"
            />
          </div>
        )}
      </div>
    </div>
  );
};
