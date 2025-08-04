import { Link } from 'react-router-dom';
import Hero from '../components/Hero';

function Home() {
  const journeyPages = [
    {
      title: 'Browse Categories',
      description: 'Explore our product categories',
      path: '/category',
      icon: '🛍️',
    },
    {
      title: 'Product Detail',
      description: 'View detailed product information',
      path: '/product/1',
      icon: '📦',
    },
    {
      title: 'Checkout',
      description: 'Complete your purchase',
      path: '/checkout',
      icon: '💳',
    },
    {
      title: 'Order Confirmation',
      description: 'View your order details',
      path: '/order/123',
      icon: '✅',
    },
  ];

  return (
    <div className="py-8">
      <Hero />

      <div className="mt-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          E-commerce Journey Demo
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Explore the typical e-commerce user journey with walkerOS tracking
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {journeyPages.map((page) => (
            <Link
              key={page.path}
              to={page.path}
              className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-4">{page.icon}</span>
                <h2 className="text-xl font-semibold text-gray-900">
                  {page.title}
                </h2>
              </div>
              <p className="text-gray-600">{page.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
