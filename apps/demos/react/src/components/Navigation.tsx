import { Link, useLocation } from 'react-router-dom';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 w-full bg-white shadow-sm z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">walkerOS React Demo</h1>
          </div>

          <div className="flex space-x-8 items-center">
            <Link
              to="/"
              data-elbglobals="page:A"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                location.pathname === '/'
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-900 hover:text-gray-700'
              }`}
            >
              Page A
            </Link>
            <Link
              to="/page-b"
              data-elbglobals="page:B"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                location.pathname === '/page-b'
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-900 hover:text-gray-700'
              }`}
            >
              Page B
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
