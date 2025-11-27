/**
 * Platform abstraction types for Sniff
 *
 * These types define a normalized interface for different platforms
 * (Linear, GitHub, Slack, etc.) allowing agents to work across platforms
 * with a consistent API.
 */

/**
 * Supported platforms
 */
export type PlatformName = 'linear' | 'github' | 'slack';

/**
 * Normalized event types that all platforms produce
 */
export type PlatformEventType = 'issue_created' | 'issue_updated' | 'comment_created' | 'mention';

/**
 * Normalized issue/ticket representation across platforms
 */
export interface NormalizedIssue {
  /** Platform-specific ID */
  id: string;
  /** Issue title */
  title: string;
  /** Issue description/body (markdown) */
  description: string;
  /** Current state (e.g., "open", "closed", "in_progress") */
  state: string;
  /** State category for cross-platform compatibility */
  stateType: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled';
  /** Labels/tags */
  labels: string[];
  /** Priority (1 = urgent, 4 = low, 0 = none) */
  priority: number;
  /** Assignee info if assigned */
  assignee?: {
    id: string;
    name: string;
    email?: string;
  };
  /** URL to view the issue */
  url: string;
  /** When the issue was created */
  createdAt: Date;
  /** When the issue was last updated */
  updatedAt: Date;
}

/**
 * User/actor who triggered an event
 */
export interface PlatformActor {
  /** Platform-specific user ID */
  id: string;
  /** Display name */
  name: string;
  /** Email if available */
  email?: string;
  /** Whether this actor is a bot/automation */
  isBot: boolean;
}

/**
 * Normalized comment representation
 */
export interface NormalizedComment {
  /** Comment ID */
  id: string;
  /** Comment body (markdown) */
  body: string;
  /** Who wrote the comment */
  author: PlatformActor;
  /** When it was created */
  createdAt: Date;
}

/**
 * Normalized event that all platforms produce
 * This is the input to the agent runtime
 */
export interface PlatformEvent {
  /** What happened */
  type: PlatformEventType;
  /** Which platform this came from */
  platform: PlatformName;
  /** The issue/ticket this event relates to */
  issue: NormalizedIssue;
  /** Who triggered this event */
  actor: PlatformActor;
  /** Comment if this is a comment event */
  comment?: NormalizedComment;
  /** Platform-specific raw data for advanced use cases */
  raw: unknown;
}

/**
 * Context for sending responses back to the platform
 */
export interface ResponseContext {
  /** Platform name */
  platform: PlatformName;
  /** Issue ID to respond to */
  issueId: string;
  /** Optional: reply to a specific comment */
  parentCommentId?: string;
}

/**
 * Activity types the agent can report
 */
export type ActivityType = 'thinking' | 'tool_use' | 'responding' | 'error';

/**
 * Context for sending activity updates
 */
export interface ActivityContext {
  /** Platform name */
  platform: PlatformName;
  /** Issue ID */
  issueId: string;
  /** Session ID for grouping activities */
  sessionId: string;
}

/**
 * Activity update to send to the platform
 */
export interface Activity {
  type: ActivityType;
  message: string;
  /** Tool name if type is 'tool_use' */
  toolName?: string;
  /** Tool input if type is 'tool_use' */
  toolInput?: unknown;
}

/**
 * Message in a conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Who sent this message */
  author?: PlatformActor;
  /** When it was sent */
  timestamp: Date;
}

/**
 * Platform credentials loaded from environment
 */
export interface PlatformCredentials {
  /** Access token for API calls */
  accessToken: string;
  /** Webhook secret for verifying incoming webhooks */
  webhookSecret?: string;
}
