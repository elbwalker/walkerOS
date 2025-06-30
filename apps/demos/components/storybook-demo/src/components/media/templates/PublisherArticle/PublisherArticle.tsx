import { Header } from '../../../shared/organisms/Header';
import { ArticleList } from '../../organisms/ArticleList';
import { Typography } from '../../../shared/atoms/Typography';
import { Button } from '../../../shared/atoms/Button';
import type { ArticleCardProps } from '../../molecules/ArticleCard';
import './PublisherArticle.css';

export interface ArticleData {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl?: string;
  author: string;
  publishedAt: string;
  category: 'news' | 'stars' | 'life';
  readTime: string;
  tags: string[];
}

export interface PublisherArticleProps {
  article: ArticleData;
  recommendedArticles?: ArticleCardProps[];
  user?: {
    name: string;
    avatar?: string;
  };
  onRecommendedClick?: (id: string) => void;
  onBackToHome?: () => void;
}

const defaultRecommendedArticles: ArticleCardProps[] = [
  {
    id: 'rec1',
    title: 'Related: Scientists Make Another Breakthrough',
    excerpt: 'Following recent discoveries, researchers continue to push the boundaries of what we thought was possible.',
    imageUrl: 'https://picsum.photos/300/160?random=50',
    author: 'Dr. James Wilson',
    publishedAt: '2 hours ago',
    category: 'news',
    readTime: '4 min',
  },
  {
    id: 'rec2',
    title: 'Behind the Scenes: More Celebrity Stories',
    excerpt: 'Dive deeper into Hollywood with these exclusive interviews and behind-the-scenes content.',
    imageUrl: 'https://picsum.photos/300/160?random=51',
    author: 'Maria Santos',
    publishedAt: '5 hours ago',
    category: 'stars',
    readTime: '6 min',
  },
  {
    id: 'rec3',
    title: 'Wellness Tips: Building on Healthy Habits',
    excerpt: 'Expand your wellness journey with these additional tips for living your best life.',
    imageUrl: 'https://picsum.photos/300/160?random=52',
    author: 'Lisa Anderson',
    publishedAt: '1 day ago',
    category: 'life',
    readTime: '5 min',
  },
];

export const PublisherArticle = ({
  article,
  recommendedArticles = defaultRecommendedArticles,
  user,
  onRecommendedClick,
  onBackToHome,
  ...props
}: PublisherArticleProps) => {
  const handleLogin = () => {
    alert('Login functionality would be implemented here.');
  };

  const handleSignup = () => {
    alert('Signup functionality would be implemented here.');
  };

  const handleLogout = () => {
    alert('Logout functionality would be implemented here.');
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
    <div className="storybook-publisher-article" {...props}>
      <Header
        title="Daily Chronicle"
        logo="https://via.placeholder.com/120x32/1ea7fd/ffffff?text=NEWS"
        user={user}
        showSearch={false}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onLogout={handleLogout}
      />
      
      <main className="storybook-publisher-article__main">
        <div className="storybook-publisher-article__nav">
          <Button
            label="← Back to Home"
            onClick={onBackToHome}
            size="small"
          />
        </div>

        <article className="storybook-publisher-article__content">
          <div className="storybook-publisher-article__header">
            <div className="storybook-publisher-article__category">
              <Typography variant="caption" color={getCategoryColor(article.category) as any}>
                {article.category.toUpperCase()}
              </Typography>
            </div>
            
            <Typography variant="h1" className="storybook-publisher-article__title">
              {article.title}
            </Typography>
            
            <div className="storybook-publisher-article__meta">
              <Typography variant="body2" color="secondary">
                By {article.author} • {article.publishedAt} • {article.readTime} read
              </Typography>
            </div>
            
            {article.tags.length > 0 && (
              <div className="storybook-publisher-article__tags">
                {article.tags.map((tag, index) => (
                  <span key={index} className="storybook-publisher-article__tag">
                    <Typography variant="caption">#{tag}</Typography>
                  </span>
                ))}
              </div>
            )}
          </div>

          {article.imageUrl && (
            <div className="storybook-publisher-article__image">
              <img src={article.imageUrl} alt={article.title} />
            </div>
          )}

          <div className="storybook-publisher-article__body">
            <Typography variant="body1">
              {article.content}
            </Typography>
          </div>
        </article>

        {recommendedArticles.length > 0 && (
          <section className="storybook-publisher-article__recommended">
            <ArticleList
              title="Recommended for You"
              articles={recommendedArticles}
              layout="grid"
              columns={3}
              onArticleClick={onRecommendedClick}
            />
          </section>
        )}
      </main>

      <footer className="storybook-publisher-article__footer">
        <Typography variant="body2" align="center" color="secondary">
          © 2024 Daily Chronicle • Built with Atomic Design Components
        </Typography>
      </footer>
    </div>
  );
};