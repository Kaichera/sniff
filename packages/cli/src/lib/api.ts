// packages/cli/src/lib/api.ts
import { Config } from './config.js';
import { logger } from './logger.js';

const config = new Config();

class ApiClient {
  private getBaseUrl(): string {
    return config.get('apiUrl') || 'https://api.sniff.to';
  }

  async request<T>(endpoint: string, options: RequestInit & { token?: string }): Promise<T> {
    const { token, ...fetchOptions } = options;
    const url = `${this.getBaseUrl()}${endpoint}`;

    const headers: Record<string, string> = {};

    // Only set Content-Type if there's a body
    if (fetchOptions.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    logger.debug(`[API] ${fetchOptions.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    logger.debug(`[API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ message: response.statusText }))) as {
        message?: string;
        error?: string;
      };
      const errorMessage =
        error.message || error.error || `API request failed: ${response.statusText}`;
      logger.error(`[API] Error details:`, error);
      throw new Error(`${errorMessage} (HTTP ${response.status})`);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', token });
  }

  async post<T>(endpoint: string, body: any, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    });
  }

  async put<T>(endpoint: string, body: any, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      token,
    });
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', token });
  }
}

export const api = new ApiClient();
