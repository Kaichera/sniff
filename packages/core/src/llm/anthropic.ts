/**
 * Direct Anthropic client
 *
 * Makes authenticated requests to Anthropic API directly
 * without any proxy layer (replacing Ampersand).
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export interface AnthropicClientConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ToolUseEvent {
  id: string;
  name: string;
  input: unknown;
}

export interface ThinkingEvent {
  thinking: string;
}

export interface MessageOptions {
  systemPrompt: string;
  userMessage?: string;
  conversationMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  thinking?: { type: 'enabled'; budget_tokens: number } | { type: 'disabled' };
  tools?: unknown[];
  mcpServers?: Array<{
    type: string;
    url: string;
    name: string;
    authorization_token?: string;
    tool_configuration?: unknown;
  }>;
  onToolUse?: (tool: ToolUseEvent) => Promise<void>;
  onThinking?: (thinking: ThinkingEvent) => Promise<void>;
  onInterimText?: (text: string) => Promise<void>;
}

export interface MessageResponse {
  content: string;
  tokensUsed: number;
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

interface ApiResponse {
  content: ContentBlock[];
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Error thrown when Anthropic API requests fail
 */
export class AnthropicApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AnthropicApiError';
  }
}

/**
 * Direct Anthropic API client
 */
/**
 * Create an Anthropic client instance
 */
export function createAnthropicClient(config: AnthropicClientConfig): AnthropicClient {
  return new AnthropicClient(config);
}

export class AnthropicClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AnthropicClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Send a message to Claude and get a response
   * Implements agentic loop to handle tool use
   */
  async sendMessage(options: MessageOptions): Promise<MessageResponse> {
    const {
      systemPrompt,
      userMessage,
      conversationMessages,
      maxTokens,
      temperature,
      topP,
      topK,
      stopSequences,
      thinking,
      tools,
      mcpServers,
      onToolUse,
      onThinking,
      onInterimText,
    } = options;

    // Validate input
    if (!userMessage && !conversationMessages) {
      throw new Error('Either userMessage or conversationMessages must be provided');
    }
    if (userMessage && conversationMessages) {
      throw new Error('Cannot provide both userMessage and conversationMessages');
    }

    // Initialize message history
    const messages: Array<{ role: string; content: unknown }> = conversationMessages
      ? conversationMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      : [{ role: 'user', content: userMessage }];

    let totalTokensUsed = 0;
    let finalContent = '';
    let continueLoop = true;

    // Agentic loop: continue until Claude returns a text-only response
    while (continueLoop) {
      // Detect beta features needed
      const betaFeatures: string[] = [];

      if (tools?.some((t) => (t as Record<string, unknown>).type === 'web_fetch_20250910')) {
        betaFeatures.push('web-fetch-2025-09-10');
      }

      if (mcpServers && mcpServers.length > 0) {
        betaFeatures.push('mcp-client-2025-04-04');
      }

      // Build request body
      const requestBody: Record<string, unknown> = {
        model: this.model,
        max_tokens: maxTokens || this.maxTokens,
        temperature: temperature ?? this.temperature,
        system: systemPrompt,
        messages,
      };

      if (topP !== undefined) requestBody.top_p = topP;
      if (topK !== undefined) requestBody.top_k = topK;
      if (stopSequences) requestBody.stop_sequences = stopSequences;
      if (thinking) requestBody.thinking = thinking;
      if (tools) requestBody.tools = tools;
      if (mcpServers) requestBody.mcp_servers = mcpServers;

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      };

      if (betaFeatures.length > 0) {
        headers['anthropic-beta'] = betaFeatures.join(',');
      }

      // Make API request
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AnthropicApiError(
          `Anthropic API request failed: ${response.status} - ${errorText}`,
          response.status,
        );
      }

      const data = (await response.json()) as ApiResponse;

      // Track token usage
      totalTokensUsed += (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);

      // Check for tool use blocks
      const toolUseBlocks = data.content.filter(
        (block) =>
          block.type === 'tool_use' ||
          block.type === 'server_tool_use' ||
          block.type === 'mcp_tool_use',
      );
      const hasToolUse = toolUseBlocks.length > 0;
      const hasServerToolUse = data.content.some((block) => block.type === 'server_tool_use');
      const hasMCPToolUse = data.content.some((block) => block.type === 'mcp_tool_use');

      // Handle server-side tools and MCP tools
      if (hasServerToolUse || hasMCPToolUse) {
        // Find the last tool-related block
        let lastToolIndex = -1;
        for (let i = data.content.length - 1; i >= 0; i--) {
          const blockType = data.content[i].type;
          if (
            blockType === 'server_tool_use' ||
            blockType === 'mcp_tool_use' ||
            blockType === 'web_fetch_tool_result' ||
            blockType === 'mcp_tool_result' ||
            blockType === 'tool_result'
          ) {
            lastToolIndex = i;
            break;
          }
        }

        // Process blocks sequentially
        for (let i = 0; i < data.content.length; i++) {
          const block = data.content[i];

          // Handle interim text
          if (block.type === 'text' && block.text && i < lastToolIndex && onInterimText) {
            await onInterimText(block.text);
          }

          // Handle tool use blocks
          if ((block.type === 'server_tool_use' || block.type === 'mcp_tool_use') && onToolUse) {
            await onToolUse({
              id: block.id || '',
              name: block.name || '',
              input: block.input || {},
            });
          }
        }

        // Extract final content
        finalContent = data.content
          .slice(lastToolIndex + 1)
          .filter((block) => block.type === 'text')
          .map((block) => block.text || '')
          .join('\n')
          .trim();

        continueLoop = false;
      } else if (hasToolUse && data.stop_reason === 'tool_use') {
        // Client-side tools - need to continue loop

        // Send interim text if any
        const interimTextBlocks = data.content.filter((block) => block.type === 'text');
        if (interimTextBlocks.length > 0 && onInterimText) {
          const interimText = interimTextBlocks
            .map((block) => block.text || '')
            .join('\n')
            .trim();
          if (interimText) {
            await onInterimText(interimText);
          }
        }

        // Add assistant response to messages
        messages.push({
          role: 'assistant',
          content: data.content,
        });

        // Notify about tool usage
        if (onToolUse) {
          for (const block of toolUseBlocks) {
            if (block.type === 'tool_use') {
              await onToolUse({
                id: block.id || '',
                name: block.name || '',
                input: block.input || {},
              });
            }
          }
        }

        // Create tool results (empty for server-side execution)
        const toolResults = toolUseBlocks
          .filter((block) => block.type === 'tool_use')
          .map((block) => ({
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: [],
          }));

        messages.push({
          role: 'user',
          content: toolResults,
        });

        continueLoop = true;
      } else {
        // No tool use - final response

        // Handle thinking blocks
        const thinkingBlocks = data.content.filter((block) => block.type === 'thinking');
        if (thinkingBlocks.length > 0 && onThinking) {
          for (const block of thinkingBlocks) {
            if (block.thinking) {
              await onThinking({ thinking: block.thinking });
            }
          }
        }

        // Extract final text
        finalContent = data.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text || '')
          .join('\n');

        continueLoop = false;
      }
    }

    return {
      content: finalContent,
      tokensUsed: totalTokensUsed,
    };
  }
}
