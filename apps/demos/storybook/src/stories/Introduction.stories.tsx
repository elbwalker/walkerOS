import type { Meta, StoryObj } from '@storybook/react';

// walkerOS Component Tagging Demo
const Introduction = ({
  updateGlobals,
}: {
  updateGlobals?: (newGlobals: any) => void;
}) => (
  <div
    style={{
      padding: '40px',
      fontFamily: '"Nunito Sans", sans-serif',
      maxWidth: '900px',
      margin: '0 auto',
    }}
  >
    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
      <h1 style={{ color: '#333', marginBottom: '16px', fontSize: '2.5em' }}>
        walkerOS Tagging Demo
      </h1>
      <p
        style={{
          fontSize: '20px',
          lineHeight: '1.6',
          color: '#666',
          marginBottom: '20px',
        }}
      >
        Interactive Component Library showcasing{' '}
        <strong>walkerOS tagging patterns</strong> across different domains
        using <strong>Atomic Design principles</strong>
      </p>
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          display: 'inline-block',
        }}
      >
        <strong>
          🔧 Use the Domain switcher in the toolbar above to explore tagging
          examples by domain
        </strong>
      </div>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '30px',
        margin: '50px 0',
      }}
    >
      <div
        style={{
          border: '3px solid #1ea7fd',
          borderRadius: '12px',
          padding: '30px',
          background: 'linear-gradient(145deg, #f8fcff 0%, #e3f2fd 100%)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
        onClick={() => updateGlobals && updateGlobals({ domain: 'ecommerce' })}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow =
            '0 8px 25px rgba(30, 167, 253, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <h3
          style={{
            color: '#1ea7fd',
            marginBottom: '16px',
            fontSize: '1.5em',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          🛍️ E-commerce Domain
        </h3>
        <p
          style={{ marginBottom: '20px', fontSize: '16px', lineHeight: '1.5' }}
        >
          Explore walkerOS tagging patterns for retail and shopping experiences
        </p>
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <h4
            style={{
              color: '#333',
              marginBottom: '12px',
              fontSize: '14px',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            Tagging Examples Include:
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>
              <strong>Product interactions</strong>: Card clicks, search queries
            </li>
            <li>
              <strong>Shopping behavior</strong>: Cart actions, product views
            </li>
            <li>
              <strong>User engagement</strong>: Authentication flows
            </li>
            <li>
              <strong>Commerce events</strong>: Purchase funnels, conversions
            </li>
          </ul>
        </div>
        <p style={{ fontSize: '14px', color: '#1976d2', fontWeight: 'bold' }}>
          🚀 <strong>Click here</strong> to switch to E-commerce components
        </p>
      </div>

      <div
        style={{
          border: '3px solid #f39c12',
          borderRadius: '12px',
          padding: '30px',
          background: 'linear-gradient(145deg, #fffdf7 0%, #fff3e0 100%)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
        onClick={() => updateGlobals && updateGlobals({ domain: 'media' })}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow =
            '0 8px 25px rgba(243, 156, 18, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <h3
          style={{
            color: '#f39c12',
            marginBottom: '16px',
            fontSize: '1.5em',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          📰 Media & Publishing Domain
        </h3>
        <p
          style={{ marginBottom: '20px', fontSize: '16px', lineHeight: '1.5' }}
        >
          Discover walkerOS tagging strategies for content and publishing
          platforms
        </p>
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <h4
            style={{
              color: '#333',
              marginBottom: '12px',
              fontSize: '14px',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            Tagging Examples Include:
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>
              <strong>Content engagement</strong>: Article reads, time spent
            </li>
            <li>
              <strong>Navigation patterns</strong>: Category filtering, search
            </li>
            <li>
              <strong>User preferences</strong>: Topic interests, bookmarks
            </li>
            <li>
              <strong>Publishing metrics</strong>: Content performance, shares
            </li>
          </ul>
        </div>
        <p style={{ fontSize: '14px', color: '#f57c00', fontWeight: 'bold' }}>
          🚀 <strong>Click here</strong> to switch to Media components
        </p>
      </div>
    </div>

    <div
      style={{
        background: '#f8f9fa',
        border: '2px solid #e0e0e0',
        borderRadius: '12px',
        padding: '30px',
        margin: '40px 0',
      }}
    >
      <h3 style={{ color: '#333', marginBottom: '16px', fontSize: '1.4em' }}>
        🏗️ Atomic Design + walkerOS Integration
      </h3>
      <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
        This demo shows how <strong>walkerOS tagging</strong> integrates
        seamlessly with <strong>Atomic Design methodology</strong>:
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}
        >
          <strong>🔹 Atoms</strong>
          <br />
          <span style={{ fontSize: '14px', color: '#666' }}>
            Basic tagging on buttons, inputs, typography
          </span>
        </div>
        <div
          style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}
        >
          <strong>🔸 Molecules</strong>
          <br />
          <span style={{ fontSize: '14px', color: '#666' }}>
            Combined event tracking on cards, forms
          </span>
        </div>
        <div
          style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}
        >
          <strong>🔶 Organisms</strong>
          <br />
          <span style={{ fontSize: '14px', color: '#666' }}>
            Complex interaction patterns on grids, lists
          </span>
        </div>
        <div
          style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}
        >
          <strong>🔷 Templates</strong>
          <br />
          <span style={{ fontSize: '14px', color: '#666' }}>
            Page-level analytics and user journeys
          </span>
        </div>
      </div>
    </div>

    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px',
        padding: '24px',
        margin: '30px 0',
        textAlign: 'center',
      }}
    >
      <h3 style={{ marginBottom: '16px', color: 'white' }}>🚀 Get Started</h3>
      <p style={{ marginBottom: '0', fontSize: '16px', lineHeight: '1.6' }}>
        Use the <strong>Domain dropdown</strong> in the toolbar to filter
        components by domain, then explore the tagging patterns implemented in
        each component level. Each component demonstrates practical walkerOS
        integration patterns you can apply in your own projects.
      </p>
    </div>

    <div
      style={{
        marginTop: '40px',
        padding: '20px',
        background: '#f0f7ff',
        borderRadius: '8px',
        textAlign: 'center',
        border: '1px solid #e3f2fd',
      }}
    >
      <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>
        <strong>Built with:</strong> React + TypeScript + Storybook + walkerOS +
        Atomic Design principles
      </p>
    </div>
  </div>
);

const meta: Meta<typeof Introduction> = {
  title: 'Introduction',
  component: Introduction,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'walkerOS Tagging Demo - Interactive component library showcasing walkerOS tagging patterns across E-commerce and Media domains using Atomic Design principles.',
      },
    },
  },
  tags: ['shared'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {
  render: (_, { updateGlobals }) => {
    return <Introduction updateGlobals={updateGlobals} />;
  },
};
