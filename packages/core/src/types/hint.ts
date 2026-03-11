export interface Code {
  lang?: string;
  code: string;
}

export interface Hint {
  text: string;
  code?: Array<Code>;
}

export type Hints = Record<string, Hint>;
