import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  streamChatMessage,
  sendChatMessage,
  ChatMessage,
  checkAIStatus,
  AIStatusResponse,
} from '../services/aiService';
import {
  Send,
  X,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Sparkles,
  Code2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

/** Quick prompt suggestions */
const QUICK_PROMPTS = [
  { label: '🚗 Drive forward', prompt: 'Write code to make the robot drive forward 500mm using a DriveBase on ports A and B', free: false },
  { label: '🎨 Line follow', prompt: 'Write a PID line follower using a color sensor on port C', free: false },
  { label: '🔊 Play sound', prompt: 'Write code to play different beep tones on the hub speaker', free: false },
  { label: '📐 Turn 90°', prompt: 'Write code to make the robot turn exactly 90 degrees using the gyro', free: false },
  { label: '🖥️ Display text', prompt: 'Write code to scroll text on the hub 5x5 display', free: false },
  { label: '🔍 Read sensor', prompt: 'Write code to read and print color sensor values in a loop', free: false },
  { label: '💡 Explain code', prompt: 'Explain what my current code does step by step', free: true },
  { label: '🐛 Fix errors', prompt: 'Check my current code for errors and suggest fixes', free: false },
];

/**
 * Parse an AI error string and return a user-friendly message.
 */
function parseAIError(error: string): string {
  const lower = error.toLowerCase();

  // Try to extract the message from Anthropic JSON error
  try {
    const parsed = JSON.parse(error);
    const msg = parsed?.error?.message || parsed?.detail || '';
    if (msg) {
      if (msg.includes('credit balance is too low')) {
        return `Your Anthropic API account has no credits remaining.\n\nGo to https://console.anthropic.com/settings/billing to add credits or upgrade your plan.`;
      }
      if (msg.includes('invalid x-api-key') || msg.includes('invalid api key')) {
        return `The ANTHROPIC_API_KEY is invalid.\n\nCheck that the key is correct and not expired.`;
      }
      if (msg.includes('rate limit')) {
        return `Rate limited by Anthropic API. Please wait a moment and try again.`;
      }
      return msg;
    }
  } catch {
    // Not JSON, check as plain string
  }

  if (lower.includes('credit balance') || lower.includes('billing')) {
    return `Your Anthropic API account has no credits remaining.\n\nGo to https://console.anthropic.com/settings/billing to add credits.`;
  }
  if (lower.includes('api key') || lower.includes('api_key') || lower.includes('authentication')) {
    return `ANTHROPIC_API_KEY is missing or invalid.\n\nSet it on the backend server.`;
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return `Request timed out. The AI service may be overloaded — try again.`;
  }

  return `Error: ${error}`;
}

/** Simple markdown-ish rendering for code blocks */
function renderMessage(content: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} style={{ whiteSpace: 'pre-wrap' }}>
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }

    const lang = match[1] || 'python';
    const code = match[2].trim();
    parts.push(<CodeBlock key={key++} code={code} language={lang} />);
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={key++} style={{ whiteSpace: 'pre-wrap' }}>
        {content.slice(lastIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}

/** Code block with copy + insert buttons */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const setPythonCode = useStore((s) => s.setPythonCode);
  const setCCode = useStore((s) => s.setCCode);
  const editorMode = useStore((s) => s.editorMode);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (editorMode === 'python') {
      setPythonCode(code);
    } else if (editorMode === 'c') {
      setCCode(code);
    }
  };

  return (
    <div className="ai-code-block">
      <div className="ai-code-header">
        <span className="ai-code-lang">{language}</span>
        <div className="ai-code-actions">
          <button
            className="ai-code-action-btn"
            onClick={handleInsert}
            title="Replace editor content with this code"
          >
            <Code2 size={12} />
            <span>Insert</span>
          </button>
          <button className="ai-code-action-btn" onClick={handleCopy} title="Copy code">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <pre className="ai-code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const AIChatPanel: React.FC = () => {
  const {
    showAIChat,
    toggleAIChat,
    pythonCode,
    cCode,
    editorMode,
    isActivated,
    activationExpiry,
    setActivated,
    setShowActivationModal,
  } = useStore();

  const activeCode = editorMode === 'c' ? cCode : pythonCode;

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [apiKeyInput] = useState('');
  const [useLocalKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'anthropic' | 'auto'>('auto');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check AI status on mount
  useEffect(() => {
    if (showAIChat) {
      checkAIStatus()
        .then((status) => {
          setAiStatus(status);
          // Auto-select a provider if not yet chosen
          if (selectedProvider === 'auto' && status.active_provider) {
            setSelectedProvider(status.active_provider as 'gemini' | 'anthropic');
          }
        })
        .catch(() => setAiStatus(null));
    }
  }, [showAIChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (showAIChat) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showAIChat]);

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = text || input.trim();
      if (!messageText || isLoading) return;

      setInput('');
      setShowQuickPrompts(false);

      const userMessage: ChatMessageItem = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Build conversation history for API
      const history: ChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: messageText },
      ];

      const assistantMessage: ChatMessageItem = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setIsLoading(true);
      setIsStreaming(true);
      setMessages((prev) => [...prev, assistantMessage]);

      // Determine if we have a local API key or rely on the backend
      const headers: Record<string, string> = {};
      if (useLocalKey && apiKeyInput) {
        headers['X-Anthropic-Key'] = apiKeyInput;
      }

      try {
        await streamChatMessage(
          {
            messages: history,
            current_code: activeCode,
            editor_mode: editorMode,
            stream: true,
          },
          {
            onText: (chunk) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: m.content + chunk }
                    : m
                )
              );
            },
            onDone: () => {
              setIsLoading(false);
              setIsStreaming(false);
            },
            onError: async (error) => {
              // Parse the error to give a helpful message
              const errorHint = parseAIError(error);

              // Fallback to non-streaming
              try {
                const providerToUse = selectedProvider === 'auto' ? undefined : selectedProvider;
                const response = await sendChatMessage({
                  messages: history,
                  current_code: activeCode,
                  editor_mode: editorMode,
                  stream: false,
                  provider: providerToUse,
                });
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: response.reply }
                      : m
                  )
                );
              } catch (fallbackErr) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? {
                          ...m,
                          content: `⚠️ ${errorHint}`,
                        }
                      : m
                  )
                );
              }
              setIsLoading(false);
              setIsStreaming(false);
            },
          }
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: `⚠️ Failed to connect to AI service. Is the backend running?`,
                }
              : m
          )
        );
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [input, isLoading, messages, activeCode, editorMode, useLocalKey, apiKeyInput]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowQuickPrompts(true);
  };

  if (!showAIChat) return null;

  return (
    <div className="ai-chat-panel">
      {/* Header */}
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <Sparkles size={16} />
          <span>AI Assistant</span>
          <span className="ai-chat-badge">
            {selectedProvider === 'gemini' ? 'Gemini' : selectedProvider === 'anthropic' ? 'Claude' : (aiStatus?.active_provider === 'gemini' ? 'Gemini' : 'Claude')}
          </span>
          {aiStatus?.providers?.gemini?.available && aiStatus?.providers?.anthropic?.available && (
            <select
              className="ai-provider-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as 'gemini' | 'anthropic' | 'auto')}
              title="Choose AI provider"
            >
              <option value="gemini">Gemini (free)</option>
              <option value="anthropic">Claude (paid)</option>
            </select>
          )}
        </div>
        <div className="ai-chat-header-actions">
          <button
            className="ai-chat-header-btn"
            onClick={handleClearChat}
            title="Clear conversation"
          >
            <Trash2 size={14} />
          </button>
          <button
            className="ai-chat-header-btn"
            onClick={toggleAIChat}
            title="Close AI panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-welcome">
            <div className="ai-welcome-icon">
              <Bot size={32} />
            </div>
            <h3>Spike Prime AI Assistant</h3>
            <p>
              Ask me anything about programming your LEGO Spike Prime robot!
              I can write code, explain concepts, debug errors, and more.
            </p>

            {!aiStatus?.configured && (
              <div className="ai-config-warning">
                <AlertCircle size={16} />
                <span>
                  No AI key configured. Get a free key at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>{' '}
                  and set <code>GEMINI_API_KEY</code> on the backend.
                </span>
              </div>
            )}

            {showQuickPrompts && (
              <div className="ai-quick-prompts">
                <p className="ai-quick-label">Quick prompts:</p>
                <div className="ai-quick-grid">
                  {QUICK_PROMPTS.map((qp, i) => {
                    const isExpired = activationExpiry ? new Date(activationExpiry + 'T23:59:59') < new Date() : false;
                    const needsActivation = !isActivated || isExpired;
                    const locked = needsActivation && !qp.free;
                    return (
                      <button
                        key={i}
                        className={`ai-quick-btn${locked ? ' ai-quick-btn-locked' : ''}`}
                        onClick={() => {
                          if (locked) {
                            if (isExpired) setActivated(false);
                            setShowActivationModal(true);
                          } else {
                            handleSend(qp.prompt);
                          }
                        }}
                        title={locked ? 'Subscribe to unlock this feature' : qp.prompt}
                      >
                        {locked && <span className="ai-lock-icon">🔒</span>}
                        {qp.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`ai-message ai-message-${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="ai-message-content">
              <div className="ai-message-header">
                <span className="ai-message-role">
                  {msg.role === 'user' ? 'You' : (selectedProvider === 'gemini' ? 'Gemini' : selectedProvider === 'anthropic' ? 'Claude' : (aiStatus?.active_provider === 'gemini' ? 'Gemini' : 'AI'))}
                </span>
              </div>
              <div className="ai-message-body">
                {msg.content ? (
                  renderMessage(msg.content)
                ) : isStreaming && msg.role === 'assistant' ? (
                  <span className="ai-typing-indicator">
                    <Loader2 size={14} className="ai-spin" />
                    Thinking...
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="ai-chat-input-area">
        {(() => {
          const isExpired = activationExpiry ? new Date(activationExpiry + 'T23:59:59') < new Date() : false;
          const needsActivation = !isActivated || isExpired;
          if (needsActivation) {
            return (
              <div className="ai-subscribe-overlay">
                <Sparkles size={20} />
                <p><strong>Full AI Assistant</strong> is a premium feature.</p>
                <p>You can use <strong>Explain Code</strong> for free. Subscribe to unlock all AI features including code writing, debugging, and more.</p>
                <button
                  className="ai-subscribe-btn"
                  onClick={() => {
                    if (isExpired) setActivated(false);
                    setShowActivationModal(true);
                  }}
                >
                  Subscribe to Unlock All
                </button>
              </div>
            );
          }
          return null;
        })()}
        {messages.length > 0 && (
          <div className="ai-chat-context-bar">
            <Code2 size={12} />
            <span>Editor code will be shared as context</span>
          </div>
        )}
        <div className="ai-chat-input-row">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={(!isActivated || (activationExpiry ? new Date(activationExpiry + 'T23:59:59') < new Date() : false)) ? 'Subscribe to type custom prompts...' : 'Ask about Spike Prime coding...'}
            rows={1}
            disabled={isLoading || (!isActivated || (activationExpiry ? new Date(activationExpiry + 'T23:59:59') < new Date() : false))}
          />
          <button
            className="ai-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            title="Send message (Enter)"
          >
            {isLoading ? <Loader2 size={18} className="ai-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
