export interface NavigationMenuProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

const menuItems = ['Movies', 'Series', 'Documentaries', 'Sports', 'Kids'];

export const NavigationMenu = ({ activeItem, onItemClick }: NavigationMenuProps) => {
  return (
    <nav className="hidden md:flex space-x-8">
      {menuItems.map((item) => (
        <button
          key={item}
          onClick={() => onItemClick?.(item)}
          className={`px-4 py-2 text-sm font-medium transition-colors duration-200 hover:text-primary-600 ${
            activeItem === item
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-foreground hover:text-primary-600'
          }`}
        >
          {item}
        </button>
      ))}
    </nav>
  );
};