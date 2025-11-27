/**
 * Agent Runner
 *
 * Executes an agent in response to a platform event.
 * Uses the platform abstraction for all I/O and the LLM for reasoning.
 */

import type { Platform, PlatformEvent, NormalizedIssue } from '../platforms/index.js';
import type { AnthropicClient } from '../llm/anthropic.js';

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  model?: {
    name?: string;
    temperature?: number;
    maxTokens?: number;
    thinking?: { type: 'enabled'; budget_tokens: number } | { type: 'disabled' };
    tools?: unknown[];
    mcpServers?: Array<{
      type: string;
      url: string;
      name: string;
      authorization_token?: string;
      tool_configuration?: unknown;
    }>;
  };
}

export interface AgentRunOptions {
  event: PlatformEvent;
  config: AgentConfig;
  platform: Platform;
  llmClient: AnthropicClient;
  sessionId: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AgentRunResult {
  success: boolean;
  response?: string;
  tokensUsed?: number;
  error?: string;
}

/**
 * Run an agent in response to a platform event
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const { event, config, platform, llmClient, sessionId, conversationHistory } = options;

  const isConversation = !!conversationHistory && conversationHistory.length > 0;
  const activityCtx = {
    platform: platform.name,
    issueId: event.issue.id,
    sessionId,
  };

  try {
    // 1. Send initial thinking activity
    await platform.sendActivity(activityCtx, {
      type: 'thinking',
      message: isConversation
        ? `[Agent: ${config.name}] Thinking...`
        : `[Agent: ${config.name}] Analyzing issue...`,
    });

    // 2. Build context for LLM
    let messageContent: string;
    let conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> | undefined;

    if (isConversation && conversationHistory) {
      // Use conversation history for multi-turn
      conversationMessages = [...conversationHistory];

      // Add the new user message from the event
      if (event.comment?.body) {
        conversationMessages.push({ role: 'user', content: event.comment.body });
      }

      messageContent = ''; // Not used when conversationMessages is provided
    } else {
      // Initial message: use issue data
      messageContent = formatIssueForLLM(event.issue);
    }

    // 3. Call LLM with callbacks for activities
    const response = await llmClient.sendMessage({
      systemPrompt: config.systemPrompt,
      userMessage: isConversation ? undefined : messageContent,
      conversationMessages: isConversation ? conversationMessages : undefined,
      maxTokens: config.model?.maxTokens,
      temperature: config.model?.temperature,
      thinking: config.model?.thinking,
      tools: config.model?.tools,
      mcpServers: config.model?.mcpServers,

      // Send tool use activities
      onToolUse: async (tool) => {
        await platform.sendActivity(activityCtx, {
          type: 'tool_use',
          message: `Using ${tool.name}`,
          toolName: tool.name,
          toolInput: tool.input,
        });
      },

      // Send thinking activities
      onThinking: async (thinking) => {
        await platform.sendActivity(activityCtx, {
          type: 'thinking',
          message: thinking.thinking,
        });
      },

      // Send interim text as thinking
      onInterimText: async (text) => {
        await platform.sendActivity(activityCtx, {
          type: 'thinking',
          message: text,
        });
      },
    });

    // 4. Send response
    const formattedResponse = `[Agent: ${config.name}]\n\n${response.content}`;

    await platform.sendActivity(activityCtx, {
      type: 'responding',
      message: formattedResponse,
    });

    return {
      success: true,
      response: response.content,
      tokensUsed: response.tokensUsed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Agent run failed';

    // Try to send error activity
    try {
      await platform.sendActivity(activityCtx, {
        type: 'error',
        message: `[Agent: ${config.name}] Error: ${errorMessage}`,
      });
    } catch {
      // Ignore errors when sending error activity
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Format issue data for the LLM
 */
function formatIssueForLLM(issue: NormalizedIssue): string {
  return JSON.stringify(
    {
      title: issue.title,
      description: issue.description,
      state: issue.state,
      labels: issue.labels,
      priority: issue.priority,
      url: issue.url,
    },
    null,
    2,
  );
}
