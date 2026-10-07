import Link from '@docusaurus/Link';
import {
  Button,
  CheckList,
  Hero,
  HeroTaggingViz,
  InstallCommand,
} from '@walkeros/explorer/design/components';
import { ROUTES } from './links';
import { actionTags, sectionTags } from './tags';

export default function HeroSection() {
  return (
    <Hero
      {...sectionTags('hero')}
      eyebrow="The tracking library for design systems"
      title="User behavior tracking that ships"
      highlight="with your components."
      lead="Tag a component once, and every page that uses it is tracked. No future tracking tickets, no vendor-shaped code. Switching analytics tools happens in config, not in a rebuild."
      actions={
        <>
          <Button
            {...actionTags('setup')}
            href={ROUTES.mcp}
            arrow
            linkComponent={Link}
          >
            Set up with your agent
          </Button>
          <InstallCommand {...actionTags('copy')} />
        </>
      }
      proof={
        <CheckList
          align="center"
          items={[
            'MIT-licensed',
            'Works with any framework',
            'Storybook integration',
          ]}
        />
      }
    >
      <HeroTaggingViz />
    </Hero>
  );
}
