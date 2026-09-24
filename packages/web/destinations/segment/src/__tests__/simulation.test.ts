import { expectSimulationResolves } from '@walkeros/core/dev';
import { examples } from '../dev';

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
