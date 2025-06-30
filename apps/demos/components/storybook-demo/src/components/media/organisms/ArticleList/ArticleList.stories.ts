import type { Meta, StoryObj } from '@storybook/react';
import { ArticleList } from './ArticleList';

const sampleArticles = [
  {
    id: '1',
    title: 'Breaking: Revolutionary AI Discovery Changes Everything',
    excerpt: 'Scientists have made a groundbreaking breakthrough in artificial intelligence that could transform how we interact with technology forever.',
    imageUrl: 'https://picsum.photos/400/200?random=30',
    author: 'Dr. Sarah Chen',
    publishedAt: '2 hours ago',
    category: 'news' as const,
    readTime: '5 min',
  },
  {
    id: '2',
    title: 'Celebrity Interview: Behind the Scenes of the Latest Blockbuster',
    excerpt: 'Get exclusive access to Hollywood\'s biggest stars as they share their experiences making this year\'s most anticipated film.',
    imageUrl: 'https://picsum.photos/400/200?random=31',
    author: 'Michael Rodriguez',
    publishedAt: '4 hours ago',
    category: 'stars' as const,
    readTime: '8 min',
  },
  {
    id: '3',
    title: 'Wellness Wednesday: 10 Simple Steps to Better Health',
    excerpt: 'Discover evidence-based strategies for improving your physical and mental well-being with these easy-to-implement lifestyle changes.',
    imageUrl: 'https://picsum.photos/400/200?random=32',
    author: 'Emma Johnson',
    publishedAt: '6 hours ago',
    category: 'life' as const,
    readTime: '6 min',
  },
  {
    id: '4',
    title: 'Market Update: Tech Stocks Soar After Major Announcement',
    excerpt: 'Financial markets react positively to new technology initiatives, with several major companies seeing significant gains.',
    imageUrl: 'https://picsum.photos/400/200?random=33',
    author: 'David Kim',
    publishedAt: '8 hours ago',
    category: 'news' as const,
    readTime: '4 min',
  },
  {
    id: '5',
    title: 'Red Carpet Report: Fashion Highlights from Last Night\'s Premiere',
    excerpt: 'The who\'s who of Hollywood stepped out in stunning outfits for the premiere of the year\'s most talked-about film.',
    imageUrl: 'https://picsum.photos/400/200?random=34',
    author: 'Jessica Martinez',
    publishedAt: '12 hours ago',
    category: 'stars' as const,
    readTime: '3 min',
  },
  {
    id: '6',
    title: 'Home & Garden: Creating Your Perfect Outdoor Sanctuary',
    excerpt: 'Transform your backyard into a peaceful retreat with these professional landscaping tips and affordable design ideas.',
    imageUrl: 'https://picsum.photos/400/200?random=35',
    author: 'Robert Thompson',
    publishedAt: '1 day ago',
    category: 'life' as const,
    readTime: '7 min',
  },
];

const meta: Meta<typeof ArticleList> = {
  title: 'Organisms/ArticleList',
  component: ArticleList,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { height: '800px' }
    }
  },
  tags: ['media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Latest Articles',
    articles: sampleArticles,
    onArticleClick: (id: string) => alert(`Reading article ${id}`),
  },
};

export const WithFeatured: Story = {
  args: {
    title: 'Today\'s Top Stories',
    articles: sampleArticles,
    showFeatured: true,
    onArticleClick: (id: string) => console.log(`Article clicked: ${id}`),
  },
};

export const TwoColumns: Story = {
  args: {
    title: 'Recent Updates',
    articles: sampleArticles.slice(0, 4),
    columns: 2,
    onArticleClick: (id: string) => console.log(`Article selected: ${id}`),
  },
};

export const FourColumns: Story = {
  args: {
    title: 'All Stories',
    articles: sampleArticles,
    columns: 4,
    onArticleClick: (id: string) => console.log(`Reading: ${id}`),
  },
};

export const ListView: Story = {
  args: {
    title: 'News Feed',
    articles: sampleArticles.slice(0, 4),
    layout: 'list',
    onArticleClick: (id: string) => console.log(`List article: ${id}`),
  },
};

export const MasonryLayout: Story = {
  args: {
    title: 'Discover',
    articles: sampleArticles,
    layout: 'masonry',
    onArticleClick: (id: string) => console.log(`Masonry article: ${id}`),
  },
};

export const EmptyState: Story = {
  args: {
    title: 'No Articles Yet',
    articles: [],
  },
};