export interface NavigationMenuProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

const menuItems = ['Movies', 'Series', 'Documentaries', 'Sports', 'Kids'];

export const NavigationMenu = ({
  activeItem,
  onItemClick,
}: NavigationMenuProps) => {
  return (
    <nav className="hidden md:flex space-x-8">
      {menuItems.map((item) => (
        <button
          key={item}
          onClick={() => onItemClick?.(item)}
          className={`px-4 py-2 text-ui transition-colors ${
            activeItem === item
              ? 'text-link border-b-2 border-link'
              : 'text-fg-2 hover:text-fg'
          }`}
        >
          {item}
        </button>
      ))}
    </nav>
  );
};
