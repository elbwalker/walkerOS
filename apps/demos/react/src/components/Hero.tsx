import { tagger } from '../walker';

function Hero() {
  return (
    <section
      className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white"
      {...tagger('hero').action('visible').data('text', 'Moin')}
    >
      <div className="max-w-2xl mx-auto text-center">
        <h1
          {...tagger('hero').data('title', '#innerText')}
          className="text-3xl font-bold mb-4"
        >
          Welcome to Our Premium Food Store
        </h1>
        <p className="text-lg mb-6 text-blue-100">
          Discover our carefully curated selection of sweet treats, spicy
          delights, and artisanal ice cream. Every product is crafted with
          passion and premium ingredients.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/category"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Shop Now
          </a>

          <button
            className="inline-block border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
            {...tagger('cta')
              .data('type', 'secondary')
              .data('text', 'Learn More')
              .action('click', 'learn_more')
              .get()}
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
