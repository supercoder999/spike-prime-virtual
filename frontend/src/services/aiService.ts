/**
 * AI Assistant Service - Communicates with the backend AI proxy.
 *
 * Supports Anthropic Claude (paid) and Google Gemini (free tier).
 */

import { API_BASE_URL } from './config';

const API_BASE = `${API_BASE_URL}/api/ai`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  messages: ChatMessage[];
  current_code?: string;
  editor_mode?: string;
  stream?: boolean;
  provider?: 'gemini' | 'anthropic';
}

export interface AIChatResponse {
  reply: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  provider?: string;
}

export interface AIProviderInfo {
  available: boolean;
  model: string;
  free?: boolean;
}

export interface AIStatusResponse {
  configured: boolean;
  providers: {
    anthropic: AIProviderInfo;
    gemini: AIProviderInfo;
  };
  active_provider: string | null;
  model: string;
}

/**
 * Check if AI assistant is configured on the backend.
 */
export async function checkAIStatus(): Promise<AIStatusResponse> {
  const resp = await fetch(`${API_BASE}/status`);
  if (!resp.ok) throw new Error('Failed to check AI status');
  return resp.json();
}

/**
 * Send a non-streaming chat request to Claude.
 */
export async function sendChatMessage(
  request: AIChatRequest
): Promise<AIChatResponse> {
  const resp = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stream: false }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`AI request failed (${resp.status}): ${body}`);
  }

  return resp.json();
}

/**
 * Send a streaming chat request to Claude.
 * Calls onText() for each text chunk, onDone() when finished, onError() on failure.
 */
export async function streamChatMessage(
  request: AIChatRequest,
  callbacks: {
    onText: (text: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const resp = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    callbacks.onError(`AI request failed (${resp.status}): ${body}`);
    return;
  }

  const reader = resp.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6).trim();
        if (!dataStr) continue;

        try {
          const event = JSON.parse(dataStr);
          switch (event.type) {
            case 'text':
              callbacks.onText(event.text);
              break;
            case 'done':
              callbacks.onDone();
              return;
            case 'error':
              callbacks.onError(event.error);
              return;
          }
        } catch {
          // Ignore malformed JSON in SSE
        }
      }
    }
    callbacks.onDone();
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : String(err));
  }
}
