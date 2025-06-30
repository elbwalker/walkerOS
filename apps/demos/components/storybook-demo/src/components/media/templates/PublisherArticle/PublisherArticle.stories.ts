import type { Meta, StoryObj } from '@storybook/react';
import { PublisherArticle } from './PublisherArticle';

const sampleArticle = {
  id: '1',
  title: 'Revolutionary Climate Solution Discovered: How Scientists Are Changing the Future',
  excerpt: 'Scientists unveil groundbreaking technology that could reverse climate change effects within the next decade.',
  content: `Scientists at the International Climate Research Institute have announced a breakthrough discovery that could fundamentally change how we approach climate change mitigation. The new technology, dubbed "AtmoCapture," represents a paradigm shift in carbon capture and storage.

The research team, led by Dr. Emily Watson, has developed a novel approach that combines advanced materials science with artificial intelligence to create a system that can remove carbon dioxide from the atmosphere at an unprecedented scale and efficiency.

"What makes AtmoCapture revolutionary is not just its efficiency, but its scalability," explains Dr. Watson. "We're talking about a technology that could be deployed globally, with the potential to remove gigatons of CO2 annually."

The system works by using specially engineered molecular filters that can selectively capture carbon dioxide from ambient air. These filters are then processed using a proprietary technique that converts the captured CO2 into useful materials, including construction materials and even fuel.

Initial testing has shown remarkable results. In controlled environments, the AtmoCapture system has demonstrated the ability to remove 95% of carbon dioxide from test chambers while using 60% less energy than existing carbon capture technologies.

The implications are staggering. According to the research team's calculations, widespread deployment of AtmoCapture technology could potentially reverse decades of carbon accumulation in the atmosphere within 15-20 years.

"This isn't just about slowing down climate change," notes Dr. Watson. "We're talking about the possibility of actually reversing it."

The technology is currently in late-stage development, with plans for pilot programs beginning next year. Several major governments and private organizations have already expressed interest in funding large-scale deployments.

However, challenges remain. The manufacturing process for the molecular filters requires rare earth elements, and scaling production to meet global demand will require significant investment in new infrastructure.

Despite these challenges, the scientific community is optimistic. Dr. James Peterson, a climate scientist not involved in the research, called the discovery "a potential game-changer that could redefine our approach to climate action."

The research has been published in the latest issue of Nature Climate Change and has already sparked discussions among policymakers worldwide about how to accelerate the technology's deployment.

As the world continues to grapple with the effects of climate change, discoveries like AtmoCapture offer hope that technological innovation can provide solutions to even our most pressing global challenges.`,
  imageUrl: 'https://picsum.photos/800/400?random=60',
  author: 'Dr. Emily Watson',
  publishedAt: '2 hours ago',
  category: 'news' as const,
  readTime: '8 min',
  tags: ['climate change', 'technology', 'science', 'environment', 'breakthrough'],
};

const meta: Meta<typeof PublisherArticle> = {
  title: 'Templates/PublisherArticle',
  component: PublisherArticle,
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
    article: sampleArticle,
    onRecommendedClick: (id: string) => alert(`Opening recommended article: ${id}`),
    onBackToHome: () => alert('Navigating back to home page'),
  },
};

export const LoggedInUser: Story = {
  args: {
    article: sampleArticle,
    user: {
      name: 'Bob Reader',
      avatar: 'https://i.pravatar.cc/64?img=4',
    },
    onRecommendedClick: (id: string) => console.log(`Recommended article clicked: ${id}`),
    onBackToHome: () => console.log('Back to home clicked'),
  },
};

export const StarsArticle: Story = {
  args: {
    article: {
      ...sampleArticle,
      id: '2',
      title: 'Exclusive Interview: Behind the Magic of Hollywood\'s Latest Blockbuster',
      category: 'stars' as const,
      content: `In an exclusive sit-down interview, we got unprecedented access to the cast and crew of "Stellar Horizons," this year's most anticipated science fiction epic.

Director Maria Rodriguez opened up about her vision for the film, which combines cutting-edge visual effects with deeply human storytelling. "We wanted to create something that would transport audiences to another world while still feeling emotionally grounded," she explains.

The film stars veteran actor James Mitchell alongside newcomer Sarah Kim, whose breakout performance has already generated Oscar buzz. "Working with James was like a masterclass every day," Kim shares. "He taught me that the best performances come from vulnerability and truth."

The production faced significant challenges, including filming in remote locations and coordinating complex practical effects with CGI. "There were days when we questioned if we could pull it off," admits producer David Chen. "But the team's dedication was incredible."

One of the film's most talked-about sequences involved a zero-gravity dance scene that required months of preparation and innovative rigging systems. "We wanted to do something that had never been done before," explains choreographer Lisa Park.

The film's themes of connection across vast distances resonated particularly strongly during production. "We were creating this story about finding each other across the cosmos while we ourselves were working together from different continents due to pandemic restrictions," notes Rodriguez.

Behind the scenes, the production maintained a commitment to sustainability, becoming one of the first major Hollywood productions to achieve carbon neutrality. "Art has a responsibility to the planet," states Mitchell.

Early screening reactions have been overwhelmingly positive, with many critics praising the film's emotional depth and visual innovation. "Stellar Horizons" opens nationwide next month.`,
      imageUrl: 'https://picsum.photos/800/400?random=61',
      author: 'Entertainment Weekly Staff',
      tags: ['hollywood', 'movies', 'interview', 'blockbuster', 'exclusive'],
    },
    onRecommendedClick: (id: string) => console.log(`Stars article recommendation: ${id}`),
    onBackToHome: () => console.log('Back to home from stars article'),
  },
};

export const LifeArticle: Story = {
  args: {
    article: {
      ...sampleArticle,
      id: '3',
      title: 'The Art of Mindful Living: Ancient Wisdom for Modern Challenges',
      category: 'life' as const,
      content: `In our fast-paced digital world, the ancient practice of mindfulness has never been more relevant. Dr. Sarah Chen, a leading expert in contemplative psychology, shares insights on how traditional wisdom can transform modern life.

"Mindfulness isn't just about meditation," explains Dr. Chen. "It's about cultivating a different relationship with our thoughts, emotions, and daily experiences."

The practice, rooted in Buddhist traditions but now backed by extensive scientific research, offers practical tools for managing stress, improving focus, and enhancing overall well-being.

Recent studies have shown that regular mindfulness practice can actually change the structure of the brain, strengthening areas associated with attention and emotional regulation while reducing activity in regions linked to stress and anxiety.

"What we're seeing is that mindfulness literally rewires the brain for greater resilience and happiness," notes neuroscientist Dr. Michael Thompson.

But how does one begin? Dr. Chen recommends starting small: "Even five minutes of daily practice can make a difference. The key is consistency, not duration."

Simple techniques include mindful breathing, where attention is focused on the sensation of breath, and body scanning, which involves systematically noticing physical sensations from head to toe.

The practice extends beyond formal meditation. Mindful eating, walking, and even listening can transform routine activities into opportunities for presence and awareness.

"The goal isn't to eliminate thoughts or achieve some perfect state of calm," clarifies Dr. Chen. "It's about developing a different relationship with whatever arises in our experience."

For those interested in beginning their mindfulness journey, Dr. Chen suggests finding a qualified teacher or using reputable apps and online resources. "Like any skill, mindfulness benefits from proper guidance and community support."

As we navigate an increasingly complex world, the timeless wisdom of mindfulness offers a path to greater peace, clarity, and fulfillment.`,
      imageUrl: 'https://picsum.photos/800/400?random=62',
      author: 'Dr. Sarah Chen',
      tags: ['mindfulness', 'wellness', 'meditation', 'mental health', 'lifestyle'],
    },
    onRecommendedClick: (id: string) => console.log(`Life article recommendation: ${id}`),
    onBackToHome: () => console.log('Back to home from life article'),
  },
};