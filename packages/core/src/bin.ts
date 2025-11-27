#!/usr/bin/env node
/**
 * Sniff Server Entry Point
 *
 * Simple script to start the Sniff server.
 * Reads configuration from sniff.yml and credentials from environment variables.
 */

import { startServer } from './server/start.js';

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
