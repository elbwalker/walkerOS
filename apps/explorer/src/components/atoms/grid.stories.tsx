import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid } from './grid';
import { Box } from './box';

/**
 * Grid - Horizontal scrolling layout component
 *
 * Arranges Box components in a horizontal grid with optional scroll buttons.
 * Supports various row height modes: auto, equal, synced, or fixed pixel value.
 */
const meta: Meta<typeof Grid> = {
  title: 'Atoms/Grid',
  component: Grid,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Grid>;

export const Default: Story = {
  args: {
    columns: 3,
    children: (
      <>
        <Box header="Box 1">Content for box 1</Box>
        <Box header="Box 2">Content for box 2</Box>
        <Box header="Box 3">Content for box 3</Box>
      </>
    ),
  },
};

export const AutoHeight: Story = {
  args: {
    columns: 2,
    rowHeight: 'auto',
    children: (
      <>
        <Box header="Short">Short content</Box>
        <Box header="Tall">
          <div>Line 1</div>
          <div>Line 2</div>
          <div>Line 3</div>
          <div>Line 4</div>
        </Box>
      </>
    ),
  },
};

export const EqualHeight: Story = {
  args: {
    columns: 3,
    rowHeight: 'equal',
    children: (
      <>
        <Box header="Box A">Short</Box>
        <Box header="Box B">
          <div>Tall content</div>
          <div>More lines</div>
          <div>Even more</div>
        </Box>
        <Box header="Box C">Medium</Box>
      </>
    ),
  },
};

export const FixedHeight: Story = {
  args: {
    columns: 2,
    rowHeight: 200,
    children: (
      <>
        <Box header="Fixed 200px">Content fits in 200px height</Box>
        <Box header="Also 200px">Same height regardless of content</Box>
      </>
    ),
  },
};

export const CustomGap: Story = {
  args: {
    columns: 3,
    gap: 32,
    children: (
      <>
        <Box header="Wide Gap">32px gap between boxes</Box>
        <Box header="Box 2">Content</Box>
        <Box header="Box 3">Content</Box>
      </>
    ),
  },
};

export const NoScrollButtons: Story = {
  args: {
    columns: 2,
    showScrollButtons: false,
    children: (
      <>
        <Box header="No Buttons">Scroll buttons hidden</Box>
        <Box header="Box 2">Content</Box>
      </>
    ),
  },
};
