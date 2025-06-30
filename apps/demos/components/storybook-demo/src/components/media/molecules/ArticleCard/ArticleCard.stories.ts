import type { Meta, StoryObj } from '@storybook/react';
import { ArticleCard } from './ArticleCard';

const meta: Meta<typeof ArticleCard> = {
  title: 'Media/Molecules/ArticleCard',
  component: ArticleCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: '1',
    title: 'Breaking: Major Tech Breakthrough Announced',
    excerpt: 'Scientists have made a groundbreaking discovery that could revolutionize the way we think about technology and its impact on society.',
    imageUrl: 'https://picsum.photos/400/200?random=20',
    author: 'Jane Smith',
    publishedAt: '2 hours ago',
    category: 'news',
    readTime: '5 min',
    onReadMore: (id: string) => alert(`Reading article ${id}`),
  },
};

export const Featured: Story = {
  args: {
    id: '2',
    title: 'Celebrity Spotlight: Behind the Scenes of Hollywood\'s Latest Blockbuster',
    excerpt: 'Get an exclusive look at the making of this year\'s most anticipated film, featuring interviews with the cast and crew.',
    imageUrl: 'https://picsum.photos/600/300?random=21',
    author: 'Michael Johnson',
    publishedAt: '1 hour ago',
    category: 'stars',
    readTime: '8 min',
    variant: 'featured',
    onReadMore: (id: string) => console.log(`Featured article ${id}`),
  },
};

export const Compact: Story = {
  args: {
    id: '3',
    title: 'Healthy Living: 10 Simple Tips for Better Sleep',
    excerpt: 'Discover science-backed strategies to improve your sleep quality and wake up feeling refreshed every morning.',
    imageUrl: 'https://picsum.photos/300/160?random=22',
    author: 'Dr. Sarah Wilson',
    publishedAt: '3 hours ago',
    category: 'life',
    readTime: '4 min',
    variant: 'compact',
    onReadMore: (id: string) => console.log(`Compact article ${id}`),
  },
};

export const NewsCategory: Story = {
  args: {
    id: '4',
    title: 'Economic Update: Markets React to New Policy Changes',
    excerpt: 'Financial experts weigh in on the latest economic developments and what they mean for everyday consumers.',
    imageUrl: 'https://picsum.photos/400/200?random=23',
    author: 'Robert Chen',
    publishedAt: '4 hours ago',
    category: 'news',
    readTime: '6 min',
    onReadMore: (id: string) => console.log(`News article ${id}`),
  },
};

export const LifeCategory: Story = {
  args: {
    id: '5',
    title: 'Home & Garden: Creating Your Perfect Outdoor Space',
    excerpt: 'Transform your backyard into a beautiful oasis with these expert landscaping tips and design ideas.',
    imageUrl: 'https://picsum.photos/400/200?random=24',
    author: 'Emma Davis',
    publishedAt: '6 hours ago',
    category: 'life',
    readTime: '7 min',
    onReadMore: (id: string) => console.log(`Life article ${id}`),
  },
};