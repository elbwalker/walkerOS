import { Button } from '../../../shared/atoms/Button';
import './CategoryFilter.css';

export type Category = 'all' | 'news' | 'stars' | 'life';

export interface CategoryFilterProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

const categories: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'news', label: 'News' },
  { key: 'stars', label: 'Stars' },
  { key: 'life', label: 'Life' },
];

export const CategoryFilter = ({ activeCategory, onCategoryChange, ...props }: CategoryFilterProps) => {
  return (
    <div className="storybook-category-filter" {...props}>
      {categories.map(({ key, label }) => (
        <Button
          key={key}
          label={label}
          primary={activeCategory === key}
          size="small"
          onClick={() => onCategoryChange(key)}
        />
      ))}
    </div>
  );
};