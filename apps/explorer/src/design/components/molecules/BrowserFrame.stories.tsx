import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoPlaceholder } from '../atoms/PhotoPlaceholder';
import { BrowserFrame, type BrowserFrameProps } from './BrowserFrame';

const BOOKMARKS = [
  { label: 'Shop', url: 'https://example.com/shop' },
  { label: 'Media', url: 'https://example.com/media' },
];

const meta: Meta<typeof BrowserFrame> = {
  title: 'Design/Molecules/BrowserFrame',
  component: BrowserFrame,
  tags: ['autodocs'],
  // The frame takes its size from the caller.
  args: {
    url: BOOKMARKS[0].url,
    bookmarks: BOOKMARKS,
    style: { height: 360 },
    children: <PhotoPlaceholder label="page" style={{ height: '100%' }} />,
  },
};
export default meta;

/**
 * A bookmark click opens its page; reload mounts the page again, so its load
 * count goes up.
 */
function Browsing(args: BrowserFrameProps) {
  const [url, setUrl] = useState(args.url);
  const [loads, setLoads] = useState(1);
  const label = BOOKMARKS.find((bookmark) => bookmark.url === url)?.label;
  return (
    <BrowserFrame
      {...args}
      url={url}
      onNavigate={(next) => {
        setUrl(next);
        setLoads(1);
      }}
      onReload={() => setLoads((count) => count + 1)}
    >
      <PhotoPlaceholder
        key={`${url} ${loads}`}
        label={`${label ?? 'page'} page, load ${loads}`}
        style={{ height: '100%' }}
      />
    </BrowserFrame>
  );
}

export const Default: StoryObj<typeof BrowserFrame> = {
  render: (args) => <Browsing {...args} />,
};

/** Without `onNavigate` the bookmarks show the pages but are disabled. */
export const Static: StoryObj<typeof BrowserFrame> = {};

export const AddressOnly: StoryObj<typeof BrowserFrame> = {
  args: { bookmarks: undefined },
};
