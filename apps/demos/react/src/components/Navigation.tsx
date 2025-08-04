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

          <div className="flex space-x-6 items-center">
            <Link
              to="/"
              data-elbglobals="page:home"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                location.pathname === '/'
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-900 hover:text-gray-700'
              }`}
            >
              Home
            </Link>
            <Link
              to="/category"
              data-elbglobals="page:category"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                location.pathname === '/category'
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-900 hover:text-gray-700'
              }`}
            >
              Products
            </Link>
            <Link
              to="/product/1"
              data-elbglobals="page:product"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                location.pathname.startsWith('/product')
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-900 hover:text-gray-700'
              }`}
            >
              Product
            </Link>
            <Link
              to="/checkout"
              data-elbglobals="page:checkout"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                location.pathname === '/checkout'
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-900 hover:text-gray-700'
              }`}
            >
              Checkout
            </Link>
            <Link
              to="/order/123"
              data-elbglobals="page:order"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                location.pathname.startsWith('/order')
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-900 hover:text-gray-700'
              }`}
            >
              Order
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
