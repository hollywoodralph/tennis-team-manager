// Ollama Cloud AI integration
// Native /api/chat endpoint (NOT /v1/chat/completions — that returns 401 with Ollama Cloud keys)
import "server-only";

const DEFAULT_BASE = "https://api.ollama.com";
const DEFAULT_MODEL = "kimi-k2.6:cloud";

function getBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_BASE).replace(/\/$/, "").replace(/\/v1$/, "");
}

function getModel() {
  return process.env.OLLAMA_MODEL || DEFAULT_MODEL;
}

function getApiKey() {
  return process.env.OLLAMA_API_KEY;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export async function ollamaChat(messages: ChatMessage[], options: ChatOptions = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "OLLAMA_API_KEY is not set. Add it to your Railway env vars. Get a key at https://ollama.com/settings/keys"
    );
  }

  const res = await fetch(`${getBaseUrl()}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || getModel(),
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.message?.content ?? "";
}

export async function ollamaChatJSON<T = any>(messages: ChatMessage[], options: ChatOptions = {}): Promise<T> {
  const raw = await ollamaChat(messages, options);
  // Try to extract JSON from the response (handle markdown-wrapped JSON)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Ollama response: " + raw.slice(0, 200));
  }
  return JSON.parse(jsonMatch[0]) as T;
}
