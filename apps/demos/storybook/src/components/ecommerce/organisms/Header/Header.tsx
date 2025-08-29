import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { SearchBox } from '../../../ecommerce/molecules/SearchBox';
import './Header.css';

export interface HeaderProps {
  logo?: string;
  title?: string;
  showSearch?: boolean;
  showAuthButtons?: boolean;
  onSearch?: (query: string) => void;
  onLogin?: () => void;
  onSignup?: () => void;
  user?: {
    name: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export const Header = ({
  logo,
  title = 'Demo App',
  showSearch = true,
  showAuthButtons = true,
  onSearch,
  onLogin,
  onSignup,
  user,
  onLogout,
}: HeaderProps) => {
  return (
    <header className="storybook-header">
      <div className="storybook-header__container">
        <div className="storybook-header__brand">
          {logo && (
            <img src={logo} alt="Logo" className="storybook-header__logo" />
          )}
          <Typography variant="h3" color="primary">
            {title}
          </Typography>
        </div>

        {showSearch && (
          <div className="storybook-header__search">
            <SearchBox
              placeholder="Search products..."
              onSearch={onSearch}
              size="medium"
            />
          </div>
        )}

        <div className="storybook-header__actions">
          {user ? (
            <div className="storybook-header__user">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="storybook-header__avatar"
                />
              )}
              <Typography variant="body1">Welcome, {user.name}</Typography>
              <Button label="Logout" onClick={onLogout} size="small" />
            </div>
          ) : (
            showAuthButtons && (
              <div className="storybook-header__auth">
                <Button label="Login" onClick={onLogin} size="small" />
                <Button
                  label="Sign Up"
                  onClick={onSignup}
                  primary
                  size="small"
                />
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
};
