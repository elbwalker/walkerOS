function PageB() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Page B - Demo Content
      </h1>

      <div className="space-y-12">
        {/* Hero Section Placeholder */}
        <section className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold mb-4">Hero Section</h2>
          <p className="text-gray-600">
            Same components as Page A but with different page global context.
          </p>
        </section>

        {/* Forms Section Placeholder */}
        <section className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold mb-4">Form Tracking</h2>
          <p className="text-gray-600">
            Form with input tracking will be demonstrated here.
          </p>
        </section>

        {/* Recommendations Section Placeholder */}
        <section className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold mb-4">Recommendations</h2>
          <p className="text-gray-600">
            Recommendation tracking examples will be shown here.
          </p>
        </section>
      </div>
    </div>
  );
}

export default PageB;
