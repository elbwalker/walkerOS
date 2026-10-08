import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import type { SourceBrowser } from '@walkeros/web-source-browser';
import { ViewSource } from './view-source';

const meta: Meta<typeof ViewSource> = {
  title: 'Molecules/ViewSource',
  component: ViewSource,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Hover the promotion and use the toggle to see and edit its HTML in place; Escape leaves the editor. Back in Visual, an edit replaces the element and `elb` gets `walker init` for it (logged in Actions; without `elb` a notice says the triggers were not refreshed). The Reset icon brings the original back and gets `walker init` for it too.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ViewSource>;

// The Actions panel stands in for the page's walkerOS: it logs the call and
// accepts it.
const logInit = action('elb');

export const TaggedSample: Story = {
  args: {
    elb: async (...args: Parameters<SourceBrowser.BrowserArguments>) => {
      logInit(...args);
      return { ok: true };
    },
    children: (
      <section
        data-elb="promotion"
        data-elbaction="visible:view"
        data-elbcontext="test:engagement"
      >
        <h2 data-elb-promotion="name:#innerText">Spring sale</h2>
        <p data-elb-promotion="category:analytics">
          Twenty percent off every tagging workshop.
        </p>
        <button type="button" data-elbaction="click:start">
          Get started
        </button>
      </section>
    ),
  },
};
