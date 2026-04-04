import { join } from 'node:path';

const APP_DIR = '.sentinel';

export function getAppDir(): string {
  return APP_DIR;
}

export function sentinelPath(...segments: string[]): string {
  return join(getAppDir(), ...segments);
}
