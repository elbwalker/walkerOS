import { tagger } from '@site/src/components/walkerjs';

export function section(name: string): Record<string, string> {
  return tagger()
    .entity(name)
    .action('visible', 'impression')
    .context('component', name)
    .get();
}

export function click(action: string): Record<string, string> {
  return tagger().action('click', action).get();
}
