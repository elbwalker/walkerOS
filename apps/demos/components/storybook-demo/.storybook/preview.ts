import type { Preview } from '@storybook/react-vite'
import React from 'react'

export const globalTypes = {
  domain: {
    description: 'Switch between application domains',
    toolbar: {
      title: 'Domain',
      icon: 'globe',
      items: [
        { value: 'ecommerce', title: 'E-commerce', right: '🛍️' },
        { value: 'media', title: 'Media', right: '📰' },
        { value: 'all', title: 'All Components', right: '🔧' },
      ],
      dynamicTitle: true,
    },
  },
}

export const initialGlobals = {
  domain: 'ecommerce',
}

const preview: Preview = {
  globalTypes,
  initialGlobals,
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'gray', value: '#f8f9fa' },
        { name: 'dark', value: '#333333' },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1200px', height: '800px' } },
      },
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Atoms',
          'Molecules', 
          'Organisms',
          'Templates',
        ],
      },
    },
  },
  decorators: [
    (Story) => Story(),
  ],
};

export default preview;