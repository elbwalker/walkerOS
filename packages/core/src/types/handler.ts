export type Error = (error: unknown, state?: unknown) => void;

export type Log = (message: string, verbose?: boolean) => void;
