import { Typography } from '../../../shared/atoms/Typography';
import { Button } from '../../../shared/atoms/Button';
import './ArticleCard.css';

export interface ArticleCardProps {
  id: string;
  title: string;
  excerpt: string;
  imageUrl?: string;
  author: string;
  publishedAt: string;
  category: 'news' | 'stars' | 'life';
  readTime?: string;
  onReadMore?: (id: string) => void;
  variant?: 'default' | 'featured' | 'compact';
}

export const ArticleCard = ({
  variant = 'default',
  onReadMore,
  ...props
}: ArticleCardProps) => {
  const { id, title, excerpt, imageUrl, author, publishedAt, category, readTime } = props;

  const handleReadMore = () => {
    onReadMore?.(id);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'news': return 'info';
      case 'stars': return 'warning';
      case 'life': return 'success';
      default: return 'primary';
    }
  };

  return (
    <article className={`storybook-article-card storybook-article-card--${variant}`}>
      {imageUrl && (
        <div className="storybook-article-card__image">
          <img src={imageUrl} alt={title} />
          <div className="storybook-article-card__category">
            <Typography variant="caption" color={getCategoryColor(category) as any}>
              {category.toUpperCase()}
            </Typography>
          </div>
        </div>
      )}
      <div className="storybook-article-card__content">
        <Typography variant={variant === 'featured' ? 'h2' : 'h4'} className="storybook-article-card__title">
          {title}
        </Typography>
        <Typography variant="body2" color="secondary" className="storybook-article-card__excerpt">
          {excerpt}
        </Typography>
        <div className="storybook-article-card__meta">
          <Typography variant="caption" color="secondary">
            By {author} • {publishedAt}
            {readTime && ` • ${readTime} read`}
          </Typography>
        </div>
        <div className="storybook-article-card__actions">
          <Button
            label="Read More"
            onClick={handleReadMore}
            size="small"
            {...(variant === 'featured' ? { primary: true } : {})}
          />
        </div>
      </div>
    </article>
  );
};