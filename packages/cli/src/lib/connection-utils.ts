import { api } from './api.js';
import type { Connection } from './types.js';
import { logger } from './logger.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for a Linear connection to appear in the user's connections
 * Polls the /connections endpoint until a Linear connection is found or timeout occurs
 *
 * @param token - User's authentication token
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 120000 = 2 minutes)
 * @returns The Linear connection if found, null if timeout
 */
export async function waitForLinearConnection(
  token: string,
  timeoutMs: number = 120000,
): Promise<Connection | null> {
  const startTime = Date.now();
  const pollInterval = 2000; // Poll every 2 seconds

  logger.debug('[Connection] Starting to poll for Linear connection...');

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Poll for connections - connection is saved via onSuccess callback in web app
      const connections = await api.get<Connection[]>('/connections', token);
      logger.debug(`[Connection] Received ${connections.length} connection(s)`);
      const linearConn = connections.find((c) => c.provider === 'linear');

      if (linearConn) {
        logger.debug('[Connection] Linear connection found!');
        return linearConn;
      }
      logger.debug('[Connection] No Linear connection yet, will retry...');
    } catch (error) {
      // Ignore polling errors, keep trying until timeout
      // This handles network issues gracefully
      logger.error('[Connection] Polling error (will retry):', (error as Error).message);
    }

    await sleep(pollInterval);
  }

  logger.debug('[Connection] Timed out waiting for Linear connection');
  return null;
}

/**
 * Check if user has an active Linear connection
 *
 * @param token - User's authentication token
 * @returns True if Linear connection exists, false otherwise
 */
export async function hasLinearConnection(token: string): Promise<boolean> {
  try {
    logger.debug('[Connection] Checking for existing Linear connection...');
    // Get connections from database
    const connections = await api.get<Connection[]>('/connections', token);
    const hasLinear = connections.some((c) => c.provider === 'linear');
    logger.debug(`[Connection] Has Linear: ${hasLinear}`);
    return hasLinear;
  } catch (error) {
    // If we can't check, assume no connection
    logger.error('[Connection] Error checking connection:', (error as Error).message);
    return false;
  }
}
