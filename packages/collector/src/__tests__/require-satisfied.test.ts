import { startFlow } from '../flow';
import { isRequireSatisfied } from '../on';

describe('isRequireSatisfied', () => {
  async function freshCollector() {
    const { collector } = await startFlow({ run: false });
    return collector;
  }

  test('consent: presence (incl. denied) satisfies, empty does not', async () => {
    const collector = await freshCollector();
    collector.consent = {};
    expect(isRequireSatisfied(collector, 'consent')).toBe(false);
    // A denied decision still counts as "consent decided".
    collector.consent = { marketing: false };
    expect(isRequireSatisfied(collector, 'consent')).toBe(true);
  });

  test('user: presence satisfies', async () => {
    const collector = await freshCollector();
    collector.user = {};
    expect(isRequireSatisfied(collector, 'user')).toBe(false);
    collector.user = { id: 'u1' };
    expect(isRequireSatisfied(collector, 'user')).toBe(true);
  });

  test('globals: presence satisfies', async () => {
    const collector = await freshCollector();
    collector.globals = {};
    expect(isRequireSatisfied(collector, 'globals')).toBe(false);
    collector.globals = { lang: 'en' };
    expect(isRequireSatisfied(collector, 'globals')).toBe(true);
  });

  test('custom: presence satisfies', async () => {
    const collector = await freshCollector();
    collector.custom = {};
    expect(isRequireSatisfied(collector, 'custom')).toBe(false);
    collector.custom = { foo: 'bar' };
    expect(isRequireSatisfied(collector, 'custom')).toBe(true);
  });

  test('session: satisfied via seenEvents broadcast, not the vestigial cell', async () => {
    const collector = await freshCollector();
    // The `collector.session` cell is never written, so it cannot gate; a
    // broadcast (recorded in seenEvents) is what satisfies require:["session"].
    expect(isRequireSatisfied(collector, 'session')).toBe(false);
    collector.seenEvents.add('session');
    expect(isRequireSatisfied(collector, 'session')).toBe(true);
  });

  test('run / ready: satisfied iff allowed', async () => {
    const collector = await freshCollector();
    collector.allowed = false;
    expect(isRequireSatisfied(collector, 'run')).toBe(false);
    expect(isRequireSatisfied(collector, 'ready')).toBe(false);
    collector.allowed = true;
    expect(isRequireSatisfied(collector, 'run')).toBe(true);
    expect(isRequireSatisfied(collector, 'ready')).toBe(true);
  });

  test('arbitrary event: satisfied only when in seenEvents', async () => {
    const collector = await freshCollector();
    expect(isRequireSatisfied(collector, 'my custom event')).toBe(false);
    collector.seenEvents.add('my custom event');
    expect(isRequireSatisfied(collector, 'my custom event')).toBe(true);
  });

  test('onApply records the broadcast type in seenEvents', async () => {
    const { collector, elb } = await startFlow({ run: false });
    expect(collector.seenEvents.has('consent')).toBe(false);
    await elb('walker consent', { marketing: true });
    expect(collector.seenEvents.has('consent')).toBe(true);
  });
});
