/**
 * The flow child's heap, sized to the memory this instance is granted rather
 * than one fixed cap for every flow: three quarters of what is granted, less
 * what the supervisor holds, so the supervisor and Node's own memory outside
 * the heap keep the last quarter.
 */

import os from 'os';
import type { HeapFacts } from './lines.js';

const MIB = 1024 * 1024;

/** Below this a flow cannot start reliably, so nothing is started. */
export const MIN_HEAP_MB = 64;

/**
 * The memory this process may use: the container's limit when it sets one
 * below the machine's memory, else the machine's memory. Node reports no
 * limit as 0, and a limit at or above the machine's memory limits nothing.
 */
export function grantedMemoryBytes(
  read: { constrained(): number; total(): number } = {
    constrained: () => process.constrainedMemory(),
    total: () => os.totalmem(),
  },
): number {
  const total = read.total();
  const constrained = read.constrained();
  return constrained > 0 && constrained < total ? constrained : total;
}

/**
 * The child's heap in MB: `--heap` when given, else three quarters of the
 * granted memory less the supervisor's resident memory, rounded down. The
 * granted and supervisor figures are shown rounded. Throws below
 * {@link MIN_HEAP_MB}, in a line that names how the figure came about.
 */
export function childHeapMb(input: {
  grantedBytes: number;
  supervisorRssBytes: number;
  flagMb?: number;
}): HeapFacts {
  if (input.flagMb !== undefined) {
    if (input.flagMb < MIN_HEAP_MB)
      throw new Error(
        `Heap ${input.flagMb} MB for the flow, from --heap, is below the ${MIN_HEAP_MB} MB minimum`,
      );
    return { heapMb: input.flagMb, from: 'flag' };
  }
  const heap: HeapFacts = {
    heapMb: Math.floor(
      (0.75 * input.grantedBytes - input.supervisorRssBytes) / MIB,
    ),
    from: 'granted',
    grantedMb: Math.round(input.grantedBytes / MIB),
    supervisorMb: Math.round(input.supervisorRssBytes / MIB),
  };
  if (heap.heapMb < MIN_HEAP_MB)
    throw new Error(
      `Heap ${heap.heapMb} MB for the flow is below the ${MIN_HEAP_MB} MB minimum: three quarters of ${heap.grantedMb} MB granted, less ${heap.supervisorMb} MB for the supervisor`,
    );
  return heap;
}
