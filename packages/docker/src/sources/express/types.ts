import type { Source } from '@walkeros/core';
import type { Request, Response } from 'express';

/**
 * Express source types following walkerOS Source patterns
 */
export interface ExpressSourceTypes extends Source.TypesGeneric {
  Push: (req: Request, res: Response) => Promise<void>;
}
