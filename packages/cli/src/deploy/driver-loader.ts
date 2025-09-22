import type { Driver } from '@walkeros/core';
import type { DriverConfig } from './types';
import { drivers } from './driver-registry';

export async function loadDriver(
  name: string,
  config: DriverConfig,
  env?: Driver.Environment,
): Promise<Driver.Instance> {
  const driver = drivers[name];

  if (!driver) {
    const available = Object.keys(drivers).join(', ');
    throw new Error(`Unknown driver: ${name}. Available drivers: ${available}`);
  }

  // Clone the driver to avoid mutations between multiple uses
  const driverInstance = { ...driver };

  // Set config
  driverInstance.config = {
    type: `${config.type}-${name}`,
    stage: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
    credentials: config.credentials || {},
    settings: config.settings,
  };

  return driverInstance;
}
