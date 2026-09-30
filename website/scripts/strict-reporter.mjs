// Fails the run on any test:fail event, suites included. Node 22 exits 0
// when a describe body throws; this reporter turns that into exit 1.
export default async function* strict(source) {
  for await (const event of source) {
    if (event.type === 'test:fail' && !event.data.todo && !event.data.skip) {
      process.exitCode = 1;
      const kind = event.data.details?.type ?? 'test';
      yield `FAIL (${kind}) ${event.data.name}: ${event.data.details?.error?.cause?.message ?? event.data.details?.error?.message ?? ''}\n`;
    }
  }
}
