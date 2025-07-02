import type { StoryFn, StoryContext } from '@storybook/react';

export const globalTypes = {
  walkerOS: {
    description: 'walkerOS tracking',
    defaultValue: false,
    toolbar: {
      title: 'walkerOS',
      items: [
        { value: false, title: 'Disabled' },
        { value: true, title: 'Enabled' },
      ],
    },
  },
};

export const decorators = [
  (Story: StoryFn, context: StoryContext) => {
    const isWalkerOSEnabled = context.globals.walkerOS === true;
    
    // Log when walkerOS is enabled and story renders
    if (isWalkerOSEnabled) {
      console.log('hello walker');
    }
    
    return Story();
  },
];