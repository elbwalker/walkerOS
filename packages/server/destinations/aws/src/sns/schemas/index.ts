import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';
import { SetupSchema } from './setup';

export { SettingsSchema, type Settings } from './settings';
export { MappingSchema, type Mapping } from './mapping';
export {
  SetupSchema,
  SetupSubscriptionSchema,
  type Setup,
  type SetupSubscription,
} from './setup';

export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
export const setup = zodToSchema(SetupSchema);
