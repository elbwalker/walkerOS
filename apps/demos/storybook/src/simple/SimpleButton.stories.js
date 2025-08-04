import { SimpleButton } from './SimpleButton';
import { walkerOSArgTypes } from '@walkeros/storybook-addon';

export default {
  title: 'Demo/SimpleButton',
  component: SimpleButton,
  argTypes: {
    ...walkerOSArgTypes,
    label: {
      control: 'text',
      description: 'Button label text',
    },
  },
};

export const Default = {
  args: {
    label: 'Click me',
    elbEntity: 'button',
    elbAction: 'click',
    elbData: 'category:demo',
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
    elbEntity: 'promotional_button',
    elbAction: 'click',
    elbData: 'type:cta;campaign:hero;variant:primary',
    elbContext: 'page:demo;section:examples',
  },
};
