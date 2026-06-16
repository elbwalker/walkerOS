export interface RingEntry {
  time: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
}

export interface DedupedError {
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

// Wire types (ISO timestamps) — defined here so redact.ts and heartbeat.ts
// both import from this module and avoid a circular dependency.
export interface RecentError {
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}
export interface RecentLogEntry {
  time: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
}

export class LogRing {
  private readonly entries: RingEntry[] = [];
  constructor(private readonly max: number) {}

  add(entry: RingEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.max) this.entries.shift();
  }

  snapshot(limit = this.max): RingEntry[] {
    return this.entries.slice(Math.max(0, this.entries.length - limit));
  }
}

export class ErrorRing {
  private readonly map = new Map<string, DedupedError>();

  constructor(
    private readonly maxUnique: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  add(message: string): void {
    const ts = this.now();
    const existing = this.map.get(message);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = ts;
      return;
    }
    if (this.map.size >= this.maxUnique) {
      let oldestKey: string | undefined;
      let oldest = Infinity;
      for (const [k, v] of this.map) {
        if (v.lastSeen < oldest) {
          oldest = v.lastSeen;
          oldestKey = k;
        }
      }
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }
    this.map.set(message, { message, count: 1, firstSeen: ts, lastSeen: ts });
  }

  snapshot(): DedupedError[] {
    return [...this.map.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  }
}
