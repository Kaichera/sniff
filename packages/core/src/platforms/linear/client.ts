/**
 * Direct Linear GraphQL client
 *
 * Makes authenticated requests to Linear's GraphQL API
 * without any proxy layer (replacing Ampersand).
 */

const LINEAR_API_URL = 'https://api.linear.app/graphql';

export interface LinearClientConfig {
  accessToken: string;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * Error thrown when Linear API requests fail
 */
export class LinearApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly graphqlErrors?: GraphQLResponse['errors'],
  ) {
    super(message);
    this.name = 'LinearApiError';
  }
}

/**
 * Linear GraphQL client for direct API access
 */
export class LinearClient {
  private accessToken: string;

  constructor(config: LinearClientConfig) {
    this.accessToken = config.accessToken;
  }

  /**
   * Execute a GraphQL query/mutation
   */
  async request<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new LinearApiError(
        `Linear API request failed: ${response.status} - ${errorText}`,
        response.status,
      );
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors && result.errors.length > 0) {
      throw new LinearApiError(
        `GraphQL errors: ${result.errors.map((e) => e.message).join(', ')}`,
        undefined,
        result.errors,
      );
    }

    return result.data as T;
  }
}

// ─────────────────────────────────────────────────────────────
// GraphQL Queries
// ─────────────────────────────────────────────────────────────

export const QUERIES = {
  GET_ISSUE: `
    query GetIssue($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        description
        priority
        priorityLabel
        url
        createdAt
        updatedAt
        state {
          id
          name
          type
          color
        }
        assignee {
          id
          name
          email
          avatarUrl
        }
        creator {
          id
          name
          email
        }
        team {
          id
          name
          key
        }
        project {
          id
          name
        }
        cycle {
          id
          name
          number
        }
        labels {
          nodes {
            id
            name
            color
          }
        }
        comments {
          nodes {
            id
            body
            createdAt
            user {
              id
              name
              email
              isMe
            }
          }
        }
      }
    }
  `,

  GET_AGENT_SESSION_ACTIVITIES: `
    query AgentSession($id: String!) {
      agentSession(id: $id) {
        activities {
          edges {
            node {
              updatedAt
              content {
                ... on AgentActivityPromptContent {
                  body
                }
                ... on AgentActivityThoughtContent {
                  body
                }
                ... on AgentActivityActionContent {
                  action
                  parameter
                  result
                }
                ... on AgentActivityElicitationContent {
                  body
                }
                ... on AgentActivityResponseContent {
                  body
                }
                ... on AgentActivityErrorContent {
                  body
                }
              }
            }
          }
        }
      }
    }
  `,

  CREATE_COMMENT: `
    mutation CreateComment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
        comment {
          id
          body
        }
      }
    }
  `,

  CREATE_AGENT_ACTIVITY: `
    mutation CreateAgentActivity($sessionId: String!, $content: JSONObject!) {
      agentActivityCreate(
        input: {
          agentSessionId: $sessionId
          content: $content
        }
      ) {
        success
        agentActivity {
          id
        }
      }
    }
  `,
};
