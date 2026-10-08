import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OnePager } from './OnePager';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { LanguageToggle } from '../../molecules/LanguageToggle';
import { UserSwitch } from '../../molecules/UserSwitch';
import { ConsentBar } from '../../organisms/ConsentBar';
import { Footer } from '../../organisms/Footer';
import { Header } from '../../organisms/Header';

const sections = [
  { id: 'first', title: 'First section' },
  { id: 'second', title: 'Second section' },
];

// No autodocs: the pinned consent bar would stack on a docs page.
const meta: Meta<typeof OnePager> = {
  title: 'Shared/Templates/OnePager',
  tags: ['shop', 'media'],
  component: OnePager,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    header: (
      <Header
        links={sections.map(({ id, title }) => ({
          label: title,
          href: `#${id}`,
        }))}
        controls={
          <>
            <LanguageToggle language="en" onToggle={fn()} />
            <UserSwitch persona="anonymous" onSwitch={fn()} />
          </>
        }
      />
    ),
    footer: (
      <Footer
        links={[{ label: 'About', href: '#' }]}
        copyright="© 2024 Your Company, Inc. All rights reserved."
      />
    ),
    consent: (
      <ConsentBar
        state="unknown"
        onAccept={fn()}
        onDeny={fn()}
        onReset={fn()}
      />
    ),
    children: sections.map(({ id, title }) => (
      <section
        key={id}
        id={id}
        className="mx-auto max-w-(--container) px-(--gutter) py-(--section-y)"
      >
        <Heading level={2} variant="title-plan">
          {title}
        </Heading>
        <Text className="mt-4">An anchor link in the header scrolls here.</Text>
      </section>
    )),
  },
};
