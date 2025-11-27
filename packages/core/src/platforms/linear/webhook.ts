/**
 * Linear webhook parsing and verification
 */

import * as crypto from 'crypto';
import type { NormalizedIssue, PlatformActor, PlatformEvent } from '../types.js';

/**
 * Linear webhook payload types
 */
export interface LinearWebhookPayload {
  type: string;
  action: string;
  createdAt: string;
  organizationId: string;
  webhookTimestamp?: number;
  webhookId?: string;
  // For agent session webhooks
  agentSession?: LinearAgentSession;
  agentActivity?: LinearAgentActivity;
  // For direct issue webhooks
  data?: LinearIssueData;
}

export interface LinearAgentSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  issueId: string;
  status: string;
  type: string;
  creator: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  comment: {
    id: string;
    body: string;
    issueId: string;
  };
  issue: {
    id: string;
    title: string;
    teamId: string;
    team: {
      id: string;
      key: string;
      name: string;
    };
    identifier: string;
    url: string;
    description?: string;
  };
}

export interface LinearAgentActivity {
  id: string;
  createdAt: string;
  agentSessionId: string;
  content: {
    type: string;
    body?: string;
  };
}

export interface LinearIssueData {
  id: string;
  title: string;
  description?: string;
  priority: number;
  url?: string;
  createdAt: string;
  updatedAt: string;
  state?: {
    id: string;
    name: string;
    type: string;
  };
  team?: {
    id: string;
    key: string;
    name: string;
  };
  creator?: {
    id: string;
    name: string;
    email?: string;
  };
  assignee?: {
    id: string;
    name: string;
    email?: string;
  };
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

/**
 * Verify Linear webhook signature
 */
export function verifyLinearWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) {
    return false;
  }

  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
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
 * Parse Linear webhook into normalized platform event
 * Returns null if the event should be ignored
 */
export function parseLinearWebhook(payload: unknown): PlatformEvent | null {
  const webhook = payload as LinearWebhookPayload;

  // Handle agent session webhooks (when user @mentions the agent)
  if (webhook.type === 'AgentSession' && webhook.agentSession) {
    const session = webhook.agentSession;
    const issue = session.issue;

    const normalizedIssue: NormalizedIssue = {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      state: 'unknown', // Will be fetched if needed
      stateType: 'unstarted',
      labels: [],
      priority: 0,
      url: issue.url,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
    };

    const actor: PlatformActor = {
      id: session.creator.id,
      name: session.creator.name,
      email: session.creator.email,
      isBot: false, // Real user triggered the agent
    };

    return {
      type: 'mention',
      platform: 'linear',
      issue: normalizedIssue,
      actor,
      comment: {
        id: session.comment.id,
        body: session.comment.body,
        author: actor,
        createdAt: new Date(session.createdAt),
      },
      raw: webhook,
    };
  }

  // Handle agent activity webhooks (follow-up messages in a session)
  if (webhook.type === 'AgentActivity' && webhook.agentActivity && webhook.agentSession) {
    const activity = webhook.agentActivity;
    const session = webhook.agentSession;
    const issue = session.issue;

    // Only process prompt activities (user messages)
    if (activity.content.type !== 'prompt') {
      return null;
    }

    const normalizedIssue: NormalizedIssue = {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      state: 'unknown',
      stateType: 'unstarted',
      labels: [],
      priority: 0,
      url: issue.url,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(activity.createdAt),
    };

    const actor: PlatformActor = {
      id: session.creator.id,
      name: session.creator.name,
      email: session.creator.email,
      isBot: false,
    };

    return {
      type: 'comment_created',
      platform: 'linear',
      issue: normalizedIssue,
      actor,
      comment: {
        id: activity.id,
        body: activity.content.body || '',
        author: actor,
        createdAt: new Date(activity.createdAt),
      },
      raw: webhook,
    };
  }

  // Handle direct issue webhooks
  if (webhook.type === 'Issue' && webhook.data) {
    const issue = webhook.data;

    const normalizedIssue: NormalizedIssue = {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      state: issue.state?.name || 'unknown',
      stateType: mapStateType(issue.state?.type || 'unstarted'),
      labels: issue.labels?.map((l) => l.name) || [],
      priority: issue.priority,
      assignee: issue.assignee
        ? {
            id: issue.assignee.id,
            name: issue.assignee.name,
            email: issue.assignee.email,
          }
        : undefined,
      url: issue.url || '',
      createdAt: new Date(issue.createdAt),
      updatedAt: new Date(issue.updatedAt),
    };

    const actor: PlatformActor = issue.creator
      ? {
          id: issue.creator.id,
          name: issue.creator.name,
          email: issue.creator.email,
          isBot: false,
        }
      : {
          id: 'unknown',
          name: 'Unknown',
          isBot: false,
        };

    const eventType = webhook.action === 'create' ? 'issue_created' : 'issue_updated';

    return {
      type: eventType,
      platform: 'linear',
      issue: normalizedIssue,
      actor,
      raw: webhook,
    };
  }

  // Unknown webhook type - ignore
  return null;
}
