// packages/cli/src/lib/logger.ts
import { Config } from './config.js';

const config = new Config();

function isDebugEnabled(): boolean {
  return config.get('debug') === 'true' || process.env.SNIFF_DEBUG === 'true';
}

export const logger = {
  debug: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDebugEnabled()) {
      console.error(...args);
    }
  },
};
