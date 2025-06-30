import { ArticleCard, type ArticleCardProps } from '../../molecules/ArticleCard';
import { Typography } from '../../../shared/atoms/Typography';
import './ArticleList.css';

export interface ArticleListProps {
  title?: string;
  articles: ArticleCardProps[];
  layout?: 'grid' | 'list' | 'masonry';
  columns?: 2 | 3 | 4;
  onArticleClick?: (id: string) => void;
  showFeatured?: boolean;
}

export const ArticleList = ({
  title,
  articles,
  layout = 'grid',
  columns = 3,
  onArticleClick,
  showFeatured = false,
  ...props
}: ArticleListProps) => {
  const featuredArticle = showFeatured && articles.length > 0 ? articles[0] : null;
  const regularArticles = showFeatured && articles.length > 0 ? articles.slice(1) : articles;

  return (
    <section className="storybook-article-list" {...props}>
      {title && (
        <div className="storybook-article-list__header">
          <Typography variant="h2" align="center">
            {title}
          </Typography>
        </div>
      )}

      {featuredArticle && (
        <div className="storybook-article-list__featured">
          <ArticleCard
            {...featuredArticle}
            variant="featured"
            onReadMore={onArticleClick}
          />
        </div>
      )}

      {regularArticles.length > 0 && (
        <div 
          className={`storybook-article-list__${layout} storybook-article-list__${layout}--${columns}`}
        >
          {regularArticles.map((article) => (
            <ArticleCard
              key={article.id}
              {...article}
              onReadMore={onArticleClick}
            />
          ))}
        </div>
      )}

      {articles.length === 0 && (
        <div className="storybook-article-list__empty">
          <Typography variant="h4" color="secondary" align="center">
            No articles found
          </Typography>
          <Typography variant="body1" color="secondary" align="center">
            Check back later for new content
          </Typography>
        </div>
      )}
    </section>
  );
};