export interface Context {
  city?: string;
  country?: string;
  encoding?: string;
  hash?: string;
  ip?: string;
  language?: string;
  origin?: string;
  region?: string;
  userAgent?: string;
  [key: string]: string | undefined;
}
