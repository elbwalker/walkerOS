import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import './SearchBox.css';

export interface SearchBoxProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const SearchBox = ({
  placeholder = 'Search...',
  onSearch,
  disabled = false,
  size = 'medium',
}: SearchBoxProps) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`storybook-searchbox storybook-searchbox--${size}`}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        size={size}
      />
      <Button
        label="Search"
        onClick={handleSearch}
        primary
        size={size}
        disabled={disabled}
      />
    </div>
  );
};
