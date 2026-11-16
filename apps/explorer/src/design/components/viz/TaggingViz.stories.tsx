import type { Meta, StoryObj } from '@storybook/react-vite';
import { sceneFrame } from '../__stories__/SceneFrame';
import { htmlTokens, type TaggingScript } from './data/tagging';
import { TaggingViz } from './TaggingViz';

/** A product card tagged line by line, then clicked. */
const PRODUCT: TaggingScript = {
  file: 'index.html',
  lines: [
    {
      id: 'root',
      tokens: htmlTokens('<div data-elb="product">'),
      typeFrom: 300,
      typeTo: 900,
    },
    {
      id: 'name',
      tokens: htmlTokens(
        '  <h3 data-elb-product="name:#innerText">Cotton Tee</h3>',
      ),
      typeFrom: 1100,
      typeTo: 1900,
      lights: 'title',
    },
    {
      id: 'price',
      tokens: htmlTokens(
        '  <span data-elb-product="price:#innerText">25</span>',
      ),
      typeFrom: 2100,
      typeTo: 2900,
      lights: 'price',
    },
    {
      id: 'add',
      tokens: htmlTokens(
        '  <button data-elbaction="click:add">Add to cart</button>',
      ),
      typeFrom: 3100,
      typeTo: 3900,
      lights: 'add',
    },
    { id: 'end', tokens: htmlTokens('</div>'), typeFrom: 0, typeTo: 0 },
  ],
  card: {
    parts: [
      { id: 'title', text: 'Cotton Tee', role: 'title' },
      { id: 'price', text: '25', role: 'meta' },
      { id: 'add', text: 'Add to cart', role: 'action' },
    ],
  },
  events: [
    {
      name: 'product add',
      data: { name: 'Cotton Tee', price: '25' },
      at: 5400,
    },
  ],
  click: { part: 'add', at: 5250 },
};

const meta: Meta<typeof TaggingViz> = {
  title: 'Design/Viz/TaggingViz',
  component: TaggingViz,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [sceneFrame('center', 'var(--container-6xl)')],
  args: { script: PRODUCT, t: 7000 },
  argTypes: {
    t: { control: { type: 'range', min: 0, max: 7000, step: 50 } },
  },
};
export default meta;

/** The end state: every part lit, the click's event in the table. */
export const Default: StoryObj<typeof TaggingViz> = {};

/** Halfway through typing the price. */
export const Typing: StoryObj<typeof TaggingViz> = { args: { t: 2500 } };
