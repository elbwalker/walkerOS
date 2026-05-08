// Lambda (default sub-source).
export { settings, SettingsSchema, type Settings } from './lambda/schemas';
export * from './lambda/schemas/primitives';

// SQS sub-source. Prefixed so the website's <Configuration> snippet can
// remap data.schemas.sqsSettings / sqsSetup onto data.schemas.settings.
export { settings as sqsSettings } from './sqs/schemas';
export { setup as sqsSetup } from './sqs/schemas';
