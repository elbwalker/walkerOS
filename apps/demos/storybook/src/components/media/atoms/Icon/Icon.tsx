export interface IconProps {
  type: 'search' | 'profile';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const Icon = ({ type, size = 'medium', className = '' }: IconProps) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  const SearchIcon = () => (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );

  const ProfileIcon = () => (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );

  switch (type) {
    case 'search':
      return <SearchIcon />;
    case 'profile':
      return <ProfileIcon />;
    default:
      return <SearchIcon />;
  }
};
