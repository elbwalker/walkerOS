export interface Function {
  entry: Entry;
}

export interface Entry {
  (event: string): Promise<unknown>;
}
