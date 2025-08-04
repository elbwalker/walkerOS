import { SimpleButton } from './SimpleButton';
import { dataElbArgTypes } from '@walkeros/storybook-addon';

export default {
  title: 'Demo/SimpleButton',
  component: SimpleButton,
  argTypes: {
    ...dataElbArgTypes,
    label: {
      control: 'text',
      description: 'Button label text',
    },
  },
};

export const Default = {
  args: {
    label: 'Click me',
    dataElb: {
      entity: 'button',
      action: 'demo',
      data: { category: 'demo' },
    },
  },
};

export const WithoutTracking = {
  args: {
    label: 'No tracking',
  },
};

export const ComplexData = {
  args: {
    label: 'Complex tracking',
    dataElb: {
      entity: 'promotional_button',
      action: 'engage',
      data: {
        type: 'cta',
        campaign: 'hero',
        variant: 'primary',
      },
      context: {
        page: 'demo',
        section: 'examples',
      },
    },
  },
};
