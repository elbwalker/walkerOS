import { NavLink } from 'react-router-dom';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Pricing', href: '/pricing' },
];

export default function Navigation() {
  return (
    <header className="bg-elbwalker-600">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-6 flex items-center justify-between border-b border-elbwalker-500 lg:border-none">
          <div className="flex items-center">
            <a href="/">
              <span className="sr-only">React Demo</span>
              <img className="h-10 w-auto" src="/logo.png" alt="" />
            </a>
            <div className="hidden ml-10 space-x-8 lg:block">
              {navigation.map((link) => (
                <NavLink
                  className="text-base font-medium text-white hover:text-elbwalker-50"
                  key={link.name}
                  to={link.href}
                >
                  {link.name}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="ml-10 space-x-4">
            <NavLink
              className="inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-elbwalker-600 hover:bg-elbwalker-50"
              key="Log In"
              to="/login"
            >
              Log In
            </NavLink>
          </div>
        </div>
        <div className="py-4 flex flex-wrap justify-center space-x-6 lg:hidden">
          {navigation.map((link) => (
            <NavLink
              className="text-base font-medium text-white hover:text-elbwalker-50"
              key={link.name}
              to={link.href}
            >
              {link.name}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
