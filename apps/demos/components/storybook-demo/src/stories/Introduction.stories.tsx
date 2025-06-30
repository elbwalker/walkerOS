import type { Meta, StoryObj } from '@storybook/react';

// Simple introduction component instead of MDX
const Introduction = () => (
  <div style={{ padding: '40px', fontFamily: '"Nunito Sans", sans-serif', maxWidth: '800px', margin: '0 auto' }}>
    <h1 style={{ color: '#333', marginBottom: '20px' }}>Component Demo - Atomic Design System</h1>
    
    <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#666', marginBottom: '30px' }}>
      Welcome to our comprehensive component library demonstration! This Storybook showcases two complete application domains built with <strong>Atomic Design principles</strong>.
    </p>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', margin: '40px 0' }}>
      <div style={{ border: '2px solid #1ea7fd', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
        <h3 style={{ color: '#1ea7fd', marginBottom: '12px' }}>🛍️ E-commerce</h3>
        <p style={{ marginBottom: '16px' }}>Product catalogs, shopping carts, and retail experiences</p>
        <ul style={{ textAlign: 'left', margin: '16px 0' }}>
          <li>Product cards and grids</li>
          <li>Search functionality</li>
          <li>Shopping templates</li>
          <li>User authentication</li>
        </ul>
        <p style={{ fontSize: '14px', color: '#666' }}>
          👈 Navigate to <strong>E-commerce</strong> in the sidebar
        </p>
      </div>
      
      <div style={{ border: '2px solid #f39c12', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
        <h3 style={{ color: '#f39c12', marginBottom: '12px' }}>📰 Media & Publishing</h3>
        <p style={{ marginBottom: '16px' }}>News sites, blogs, and content publishing platforms</p>
        <ul style={{ textAlign: 'left', margin: '16px 0' }}>
          <li>Article cards and lists</li>
          <li>Category filtering</li>
          <li>Publisher templates</li>
          <li>Content discovery</li>
        </ul>
        <p style={{ fontSize: '14px', color: '#666' }}>
          👈 Navigate to <strong>Media</strong> in the sidebar
        </p>
      </div>
    </div>

    <div style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '20px', margin: '30px 0' }}>
      <h3 style={{ color: '#333', marginBottom: '12px' }}>🧱 Design System Foundation</h3>
      <p style={{ marginBottom: '16px' }}>All components are built on a shared <strong>Design System</strong> that includes:</p>
      <ul>
        <li><strong>Atoms</strong>: Button, Input, Typography</li>
        <li><strong>Shared Organisms</strong>: Header (adaptable for both domains)</li>
      </ul>
    </div>

    <div style={{ background: '#e8f5e8', border: '1px solid #27ae60', borderRadius: '6px', padding: '16px', margin: '20px 0' }}>
      <strong>💡 Learning Tip:</strong> Start with the Design System components to understand the foundational building blocks, then explore how they're composed into domain-specific experiences.
    </div>

    <h3 style={{ color: '#333', marginTop: '30px', marginBottom: '16px' }}>🔍 How to Explore</h3>
    <ol style={{ lineHeight: '1.6' }}>
      <li><strong>Start with Atoms</strong> in the Design System to see the building blocks</li>
      <li><strong>Explore domain-specific Molecules</strong> to see how atoms combine</li>
      <li><strong>Check out Organisms</strong> to understand complex component composition</li>
      <li><strong>Experience Templates</strong> to see complete page layouts in action</li>
    </ol>

    <div style={{ marginTop: '30px', padding: '20px', background: '#f0f7ff', borderRadius: '8px', textAlign: 'center' }}>
      <p style={{ margin: 0, fontStyle: 'italic', color: '#555' }}>
        Built with React, TypeScript, and Storybook using Atomic Design principles
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
        component: 'Welcome to the Component Demo showcasing Atomic Design principles across two domains.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {};