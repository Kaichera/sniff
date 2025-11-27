/**
 * Platform interface for Sniff
 *
 * Each platform (Linear, GitHub, Slack) implements this interface
 * to provide a consistent way to:
 * - Parse incoming webhooks
 * - Send responses and activity updates
 * - Fetch issue context and conversation history
 */

import type {
  Activity,
  ActivityContext,
  ConversationMessage,
  NormalizedIssue,
  PlatformCredentials,
  PlatformEvent,
  PlatformName,
  ResponseContext,
} from './types.js';

/**
 * Platform interface that all platform implementations must follow
 */
export interface Platform {
  /** Platform identifier */
  readonly name: PlatformName;

  /**
   * Initialize the platform with credentials
   * Called once when the server starts
   */
  initialize(credentials: PlatformCredentials): void;

  // ─────────────────────────────────────────────────────────────
  // Webhook handling
  // ─────────────────────────────────────────────────────────────

  /**
   * Verify that an incoming webhook is authentic
   * @param payload - Raw request body
   * @param signature - Signature header from the request
   * @returns true if the webhook is valid
   */
  verifyWebhook(payload: string | Buffer, signature: string): boolean;

  /**
   * Parse a webhook payload into a normalized event
   * @param payload - Raw webhook payload (parsed JSON)
   * @returns Normalized event, or null if the event should be ignored
   */
  parseWebhookEvent(payload: unknown): PlatformEvent | null;

  /**
   * Check if we should process this event
   * Filters out bot-generated events, irrelevant updates, etc.
   */
  shouldProcessEvent(event: PlatformEvent): boolean;

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────

  /**
   * Send a response to an issue/conversation
   * @param ctx - Where to send the response
   * @param message - The message content (markdown)
   */
  sendResponse(ctx: ResponseContext, message: string): Promise<void>;

  /**
   * Send an activity update (e.g., "Thinking...", "Using tool X")
   * Some platforms may not support this (no-op)
   */
  sendActivity(ctx: ActivityContext, activity: Activity): Promise<void>;

  // ─────────────────────────────────────────────────────────────
  // Context fetching
  // ─────────────────────────────────────────────────────────────

  /**
   * Get full issue details
   * Used to fetch additional context not included in webhook
   */
  getIssue(issueId: string): Promise<NormalizedIssue>;

  /**
   * Get conversation history for an issue
   * Returns messages in chronological order
   */
  getConversationHistory(issueId: string): Promise<ConversationMessage[]>;
}

/**
 * Base class for platform implementations
 * Provides common functionality and default implementations
 */
export abstract class BasePlatform implements Platform {
  abstract readonly name: PlatformName;

  protected credentials: PlatformCredentials | null = null;

  initialize(credentials: PlatformCredentials): void {
    this.credentials = credentials;
  }

  protected ensureInitialized(): PlatformCredentials {
    if (!this.credentials) {
      throw new Error(`Platform ${this.name} not initialized. Call initialize() first.`);
    }
    return this.credentials;
  }

  // Abstract methods that each platform must implement
  abstract verifyWebhook(payload: string | Buffer, signature: string): boolean;
  abstract parseWebhookEvent(payload: unknown): PlatformEvent | null;
  abstract shouldProcessEvent(event: PlatformEvent): boolean;
  abstract sendResponse(ctx: ResponseContext, message: string): Promise<void>;
  abstract getIssue(issueId: string): Promise<NormalizedIssue>;
  abstract getConversationHistory(issueId: string): Promise<ConversationMessage[]>;

  // Default implementation for activity (can be overridden)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendActivity(ctx: ActivityContext, activity: Activity): Promise<void> {
    // Default: no-op. Platforms that support activity updates override this.
  }
}
