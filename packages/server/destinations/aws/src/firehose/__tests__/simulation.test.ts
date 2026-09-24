import { expectSimulationResolves } from '@walkeros/core/dev';
import * as examples from '../examples';

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
