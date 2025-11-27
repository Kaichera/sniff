/**
 * Linear platform implementation
 *
 * Implements the Platform interface for Linear,
 * providing webhook handling, API access, and activity updates.
 */

import { BasePlatform } from '../platform.js';
import type {
  Activity,
  ActivityContext,
  ConversationMessage,
  NormalizedIssue,
  PlatformCredentials,
  PlatformEvent,
  ResponseContext,
} from '../types.js';
import { LinearClient, QUERIES } from './client.js';
import { parseLinearWebhook, verifyLinearWebhook } from './webhook.js';

/**
 * Response types from Linear GraphQL API
 */
interface LinearIssueResponse {
  issue: {
    id: string;
    identifier: string;
    title: string;
    description: string | null;
    priority: number;
    priorityLabel: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    state: {
      id: string;
      name: string;
      type: string;
      color: string;
    };
    assignee: {
      id: string;
      name: string;
      email: string;
    } | null;
    creator: {
      id: string;
      name: string;
      email: string;
    };
    team: {
      id: string;
      name: string;
      key: string;
    };
    labels: {
      nodes: Array<{
        id: string;
        name: string;
        color: string;
      }>;
    };
    comments: {
      nodes: Array<{
        id: string;
        body: string;
        createdAt: string;
        user: {
          id: string;
          name: string;
          email: string;
          isMe: boolean;
        };
      }>;
    };
  };
}

interface AgentSessionActivitiesResponse {
  agentSession: {
    activities: {
      edges: Array<{
        node: {
          updatedAt: string;
          content: {
            __typename?: string;
            body?: string;
            action?: string;
            parameter?: string;
            result?: string;
          };
        };
      }>;
    };
  };
}

/**
 * Map Linear state type to normalized state type
 */
function mapStateType(
  linearStateType: string,
): 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled' {
  switch (linearStateType) {
    case 'backlog':
      return 'backlog';
    case 'unstarted':
      return 'unstarted';
    case 'started':
      return 'started';
    case 'completed':
      return 'completed';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unstarted';
  }
}

/**
 * Linear platform implementation
 */
export class LinearPlatform extends BasePlatform {
  readonly name = 'linear' as const;
  private client: LinearClient | null = null;
  private webhookSecret: string | null = null;

  override initialize(credentials: PlatformCredentials): void {
    super.initialize(credentials);
    this.client = new LinearClient({ accessToken: credentials.accessToken });
    this.webhookSecret = credentials.webhookSecret || null;
  }

  private ensureClient(): LinearClient {
    if (!this.client) {
      throw new Error('LinearPlatform not initialized. Call initialize() first.');
    }
    return this.client;
  }

  // ─────────────────────────────────────────────────────────────
  // Webhook handling
  // ─────────────────────────────────────────────────────────────

  verifyWebhook(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      // If no secret configured, skip verification (dev mode)
      return true;
    }
    return verifyLinearWebhook(payload, signature, this.webhookSecret);
  }

  parseWebhookEvent(payload: unknown): PlatformEvent | null {
    return parseLinearWebhook(payload);
  }

  shouldProcessEvent(event: PlatformEvent): boolean {
    // Don't process events from bots (including ourselves)
    if (event.actor.isBot) {
      return false;
    }
    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────

  async sendResponse(ctx: ResponseContext, message: string): Promise<void> {
    const client = this.ensureClient();

    await client.request(QUERIES.CREATE_COMMENT, {
      issueId: ctx.issueId,
      body: message,
    });
  }

  override async sendActivity(ctx: ActivityContext, activity: Activity): Promise<void> {
    const client = this.ensureClient();

    // Map activity type to Linear's activity content format
    let content: Record<string, unknown>;

    switch (activity.type) {
      case 'thinking':
        content = {
          type: 'thought',
          body: activity.message,
        };
        break;

      case 'tool_use':
        content = {
          type: 'action',
          action: activity.toolName || 'tool',
          parameter: JSON.stringify(activity.toolInput || {}),
        };
        break;

      case 'responding':
        content = {
          type: 'response',
          body: activity.message,
        };
        break;

      case 'error':
        content = {
          type: 'error',
          body: activity.message,
        };
        break;

      default:
        content = {
          type: 'thought',
          body: activity.message,
        };
    }

    await client.request(QUERIES.CREATE_AGENT_ACTIVITY, {
      sessionId: ctx.sessionId,
      content,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Context fetching
  // ─────────────────────────────────────────────────────────────

  async getIssue(issueId: string): Promise<NormalizedIssue> {
    const client = this.ensureClient();

    const data = await client.request<LinearIssueResponse>(QUERIES.GET_ISSUE, {
      id: issueId,
    });

    const issue = data.issue;

    return {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      state: issue.state.name,
      stateType: mapStateType(issue.state.type),
      labels: issue.labels.nodes.map((l) => l.name),
      priority: issue.priority,
      assignee: issue.assignee
        ? {
            id: issue.assignee.id,
            name: issue.assignee.name,
            email: issue.assignee.email,
          }
        : undefined,
      url: issue.url,
      createdAt: new Date(issue.createdAt),
      updatedAt: new Date(issue.updatedAt),
    };
  }

  async getConversationHistory(issueId: string): Promise<ConversationMessage[]> {
    const client = this.ensureClient();

    // First, get the issue with comments
    const data = await client.request<LinearIssueResponse>(QUERIES.GET_ISSUE, {
      id: issueId,
    });

    const messages: ConversationMessage[] = [];

    // Convert comments to conversation messages
    for (const comment of data.issue.comments.nodes) {
      messages.push({
        role: comment.user.isMe ? 'assistant' : 'user',
        content: comment.body,
        author: {
          id: comment.user.id,
          name: comment.user.name,
          email: comment.user.email,
          isBot: comment.user.isMe,
        },
        timestamp: new Date(comment.createdAt),
      });
    }

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return messages;
  }

  /**
   * Get conversation history from an agent session
   * This is specific to Linear's agent session feature
   */
  async getAgentSessionHistory(sessionId: string): Promise<ConversationMessage[]> {
    const client = this.ensureClient();

    const data = await client.request<AgentSessionActivitiesResponse>(
      QUERIES.GET_AGENT_SESSION_ACTIVITIES,
      { id: sessionId },
    );

    const messages: ConversationMessage[] = [];

    for (const edge of data.agentSession.activities.edges) {
      const node = edge.node;
      const content = node.content;

      // Map activity types to conversation roles
      if (content.body) {
        // Prompt activities are user messages
        const isPrompt = content.__typename === 'AgentActivityPromptContent';
        // Response activities are assistant messages
        const isResponse = content.__typename === 'AgentActivityResponseContent';

        if (isPrompt || isResponse) {
          messages.push({
            role: isPrompt ? 'user' : 'assistant',
            content: content.body,
            timestamp: new Date(node.updatedAt),
          });
        }
      }
    }

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return messages;
  }
}
