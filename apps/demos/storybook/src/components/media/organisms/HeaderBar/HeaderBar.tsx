import { NavigationMenu } from '../../molecules/NavigationMenu';
import { Icon } from '../../atoms/Icon';
import logoImg from '../../../../assets/logo.png';

export interface HeaderBarProps {
  searchPlaceholder?: string;
  activeMenuItem?: string;
  onMenuItemClick?: (item: string) => void;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
}

export const HeaderBar = ({
  searchPlaceholder = 'Search...',
  activeMenuItem,
  onMenuItemClick,
  onSearchClick,
  onProfileClick,
}: HeaderBarProps) => {
  return (
    <header className="bg-background border-b border-surface-200 dark:border-surface-700 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img src={logoImg} alt="Media Platform" className="h-8 w-auto" />
        </div>

        {/* Navigation */}
        <NavigationMenu
          activeItem={activeMenuItem}
          onItemClick={onMenuItemClick}
        />

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onSearchClick}
            className="p-2 text-foreground hover:text-primary-600 transition-colors duration-200"
            aria-label={searchPlaceholder}
          >
            <Icon type="search" />
          </button>
          <button
            onClick={onProfileClick}
            className="p-2 text-foreground hover:text-primary-600 transition-colors duration-200"
            aria-label="Profile"
          >
            <Icon type="profile" />
          </button>
        </div>
      </div>
    </header>
  );
};
