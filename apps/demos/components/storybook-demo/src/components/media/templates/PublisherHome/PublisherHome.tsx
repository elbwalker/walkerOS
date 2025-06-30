import { useState } from 'react';
import { Header } from '../../../shared/organisms/Header';
import { ArticleList } from '../../organisms/ArticleList';
import { CategoryFilter, type Category } from '../../molecules/CategoryFilter';
import { Typography } from '../../../shared/atoms/Typography';
import type { ArticleCardProps } from '../../molecules/ArticleCard';
import './PublisherHome.css';

const sampleArticles: ArticleCardProps[] = [
  {
    id: '1',
    title: 'Breaking: Revolutionary Climate Solution Discovered',
    excerpt: 'Scientists unveil groundbreaking technology that could reverse climate change effects within the next decade.',
    imageUrl: 'https://picsum.photos/600/300?random=40',
    author: 'Dr. Emily Watson',
    publishedAt: '1 hour ago',
    category: 'news',
    readTime: '6 min',
  },
  {
    id: '2',
    title: 'Exclusive: Behind the Scenes with Award-Winning Director',
    excerpt: 'Get intimate access to the creative process behind this year\'s most critically acclaimed film.',
    imageUrl: 'https://picsum.photos/400/200?random=41',
    author: 'Marcus Johnson',
    publishedAt: '3 hours ago',
    category: 'stars',
    readTime: '9 min',
  },
  {
    id: '3',
    title: 'Mindful Living: Ancient Wisdom for Modern Life',
    excerpt: 'Discover time-tested practices that can help you find balance and peace in today\'s fast-paced world.',
    imageUrl: 'https://picsum.photos/400/200?random=42',
    author: 'Sarah Chen',
    publishedAt: '5 hours ago',
    category: 'life',
    readTime: '7 min',
  },
  {
    id: '4',
    title: 'Tech Giants Unite for Major Environmental Initiative',
    excerpt: 'Leading technology companies announce unprecedented collaboration to address global environmental challenges.',
    imageUrl: 'https://picsum.photos/400/200?random=43',
    author: 'David Park',
    publishedAt: '6 hours ago',
    category: 'news',
    readTime: '5 min',
  },
  {
    id: '5',
    title: 'Celebrity Chef\'s Secret to Perfect Home Cooking',
    excerpt: 'Learn professional techniques that will transform your kitchen skills and impress your dinner guests.',
    imageUrl: 'https://picsum.photos/400/200?random=44',
    author: 'Isabella Rodriguez',
    publishedAt: '8 hours ago',
    category: 'life',
    readTime: '4 min',
  },
  {
    id: '6',
    title: 'Music Industry Shakeup: New Streaming Platform Emerges',
    excerpt: 'Revolutionary platform promises to give artists unprecedented control over their music and earnings.',
    imageUrl: 'https://picsum.photos/400/200?random=45',
    author: 'Alex Thompson',
    publishedAt: '10 hours ago',
    category: 'stars',
    readTime: '6 min',
  },
  {
    id: '7',
    title: 'Health Alert: New Study Reveals Surprising Benefits',
    excerpt: 'Researchers discover unexpected health advantages of a common daily activity that most people overlook.',
    imageUrl: 'https://picsum.photos/400/200?random=46',
    author: 'Dr. Michael Lee',
    publishedAt: '12 hours ago',
    category: 'life',
    readTime: '5 min',
  },
  {
    id: '8',
    title: 'Political Update: Historic Bipartisan Agreement Reached',
    excerpt: 'Lawmakers from both sides come together on landmark legislation that could reshape national policy.',
    imageUrl: 'https://picsum.photos/400/200?random=47',
    author: 'Jennifer Adams',
    publishedAt: '14 hours ago',
    category: 'news',
    readTime: '8 min',
  },
];

export interface PublisherHomeProps {
  user?: {
    name: string;
    avatar?: string;
  };
}

export const PublisherHome = ({ user, ...props }: PublisherHomeProps) => {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = sampleArticles.filter(article => {
    const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleArticleClick = (id: string) => {
    const article = sampleArticles.find(a => a.id === id);
    alert(`Opening article: "${article?.title}"\n\nThis would navigate to the article detail page.`);
  };

  const handleLogin = () => {
    alert('Login functionality would be implemented here.');
  };

  const handleSignup = () => {
    alert('Signup functionality would be implemented here.');
  };

  const handleLogout = () => {
    alert('Logout functionality would be implemented here.');
  };

  return (
    <div className="storybook-publisher-home" {...props}>
      <Header
        title="Daily Chronicle"
        logo="https://via.placeholder.com/120x32/1ea7fd/ffffff?text=NEWS"
        user={user}
        onSearch={handleSearch}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onLogout={handleLogout}
      />
      
      <main className="storybook-publisher-home__main">
        <div className="storybook-publisher-home__hero">
          <Typography variant="h1" align="center" color="primary">
            Stay Informed, Stay Ahead
          </Typography>
          <Typography variant="body1" align="center" color="secondary">
            Your trusted source for breaking news, celebrity updates, and lifestyle insights
          </Typography>
        </div>

        <div className="storybook-publisher-home__filter">
          <CategoryFilter
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        <ArticleList
          articles={filteredArticles}
          onArticleClick={handleArticleClick}
          showFeatured={activeCategory === 'all' && !searchQuery}
          columns={3}
        />

        {filteredArticles.length === 0 && (
          <div className="storybook-publisher-home__no-results">
            <Typography variant="h3" align="center" color="secondary">
              No articles found
            </Typography>
            <Typography variant="body1" align="center" color="secondary">
              Try adjusting your filters or search terms
            </Typography>
          </div>
        )}
      </main>

      <footer className="storybook-publisher-home__footer">
        <Typography variant="body2" align="center" color="secondary">
          © 2024 Daily Chronicle • Built with Atomic Design Components
        </Typography>
      </footer>
    </div>
  );
};