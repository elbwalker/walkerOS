import { appendFileSync } from 'fs';

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

/** Observer fired after every {@link ErrorRing.add}; `isNew` is true only on the
 * first occurrence of a distinct message (a repeat is `isNew=false`). */
export type ErrorRingListener = (entry: DedupedError, isNew: boolean) => void;

export class ErrorRing {
  private readonly map = new Map<string, DedupedError>();
  private listener: ErrorRingListener | undefined;
  private sinkPath: string | undefined;

  constructor(
    private readonly maxUnique: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Register an observer notified after each `add`. The call is wrapped so a
   * throwing listener can never break `add` (mirrors the cli-logger `onLine`
   * try/catch). Only one listener is held; a later call replaces the prior.
   */
  setListener(listener: ErrorRingListener): void {
    this.listener = listener;
  }

  /**
   * Enable durable jsonl persistence: each first-seen message is synchronously
   * appended as one `{ message, firstSeen }` line to `path`. Synchronous append
   * is deliberate so a first-seen error survives a hard crash that beats the
   * async heartbeat flush. Without a sink, persistence is disabled (no-op).
   */
  setSink(path: string): void {
    this.sinkPath = path;
  }

  add(message: string): void {
    const ts = this.now();
    const existing = this.map.get(message);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = ts;
      this.notify(existing, false);
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
    const entry: DedupedError = {
      message,
      count: 1,
      firstSeen: ts,
      lastSeen: ts,
    };
    this.map.set(message, entry);
    this.persist(entry);
    this.notify(entry, true);
  }

  /**
   * Insert a pre-existing error (read from the durable jsonl on boot) WITHOUT
   * persisting it again or notifying the flush listener. An already-present
   * message is a no-op so a later live `add` of it dedups (count increments)
   * instead of re-shipping a duplicate first-occurrence.
   */
  seed(message: string, firstSeen: number): void {
    if (this.map.has(message)) return;
    if (this.map.size >= this.maxUnique) return;
    this.map.set(message, {
      message,
      count: 1,
      firstSeen,
      lastSeen: firstSeen,
    });
  }

  snapshot(): DedupedError[] {
    return [...this.map.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  }

  private notify(entry: DedupedError, isNew: boolean): void {
    if (!this.listener) return;
    try {
      this.listener(entry, isNew);
    } catch {
      // A throwing listener must never break `add`.
    }
  }

  private persist(entry: DedupedError): void {
    if (!this.sinkPath) return;
    try {
      appendFileSync(
        this.sinkPath,
        JSON.stringify({ message: entry.message, firstSeen: entry.firstSeen }) +
          '\n',
      );
    } catch {
      // Best-effort: a failed append must never break `add`.
    }
  }
}
