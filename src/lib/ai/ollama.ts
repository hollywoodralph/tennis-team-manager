// Ollama Cloud AI integration
// Native /api/chat endpoint (NOT /v1/chat/completions — that returns 401 with Ollama Cloud keys)
import "server-only";

const DEFAULT_BASE = "https://api.ollama.com";
// Use minimax-m3:cloud as default — Ralph's preferred Ollama Cloud model.
// It returns content directly and supports "think: false" to disable the
// verbose reasoning field, which keeps JSON responses clean.
const DEFAULT_MODEL = "minimax-m3:cloud";

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
      "User-Agent": "PhotogRalph-Tennis/1.0",
    },
    body: JSON.stringify({
      model: options.model || getModel(),
      messages,
      // Use streaming to avoid Cloudflare 524 timeouts on long generations
      // (Ollama's Cloudflare proxy kills requests idle > 100s).
      stream: true,
      think: false,
      options: {
        temperature: options.temperature ?? 0.4,
        num_predict: options.maxTokens ?? 4096,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${text}`);
  }
  if (!res.body) {
    throw new Error("Ollama returned no body");
  }

  // Stream NDJSON, accumulate content + thinking fields
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let thinking = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        const m = obj.message;
        if (m?.content) content += m.content;
        if (m?.thinking) thinking += m.thinking;
      } catch {
        // ignore malformed lines
      }
    }
  }

  let raw = content;
  const contentIsJson = /\{[\s\S]*\}/.test(content);
  const thinkingIsJson = /\{[\s\S]*\}/.test(thinking);

  if (thinkingIsJson && !contentIsJson) {
    // thinking has JSON, content doesn't — use thinking
    raw = thinking;
  } else if (!contentIsJson && thinking && content.length < 200) {
    // content is short stub; thinking is likely the full answer
    raw = thinking;
  }

  if (!raw.trim() && Array.isArray(content)) {
    raw = (content as any).map((c: any) => c.text ?? "").join("");
  }
  if (!raw.trim()) {
    throw new Error("Ollama returned empty content. content=" + content.slice(0, 200) + " thinking=" + thinking.slice(0, 200));
  }
  return raw;
}

export async function ollamaChatJSON<T = any>(messages: ChatMessage[], options: ChatOptions = {}): Promise<T> {
  const raw = await ollamaChat(messages, options);
  // Try to extract JSON from the response. Strip markdown fences if present.
  // Some models wrap JSON in ```json ... ``` blocks, others return raw.
  let candidate = raw;

  // Remove ```json ... ``` fences
  const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    candidate = fenceMatch[1];
  }

  // Find the first balanced JSON object
  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in Ollama response: " + raw.slice(0, 200));
  }

  // Walk the string to find the matching close brace (handle nested objects/strings/escapes)
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    throw new Error("Unbalanced JSON braces in Ollama response: " + raw.slice(0, 200));
  }

  const jsonText = candidate.slice(start, end + 1);
  return JSON.parse(jsonText) as T;
}

// Streaming version: yields content chunks as they arrive (NDJSON).
// Use this for long generations where you want progressive UI updates.
export async function* ollamaChatStream(
  messages: ChatMessage[],
  options: ChatOptions = {}
): AsyncGenerator<string, void, void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OLLAMA_API_KEY is not set. Add it to your Railway env vars. Get a key at https://ollama.com/settings/keys");
  }

  const res = await fetch(`${getBaseUrl()}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "PhotogRalph-Tennis/1.0",
    },
    body: JSON.stringify({
      model: options.model || getModel(),
      messages,
      stream: true,
      think: false,
      options: {
        temperature: options.temperature ?? 0.4,
        num_predict: options.maxTokens ?? 4096,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${text}`);
  }
  if (!res.body) throw new Error("Ollama returned no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        const c = obj.message?.content;
        if (c) yield c;
      } catch {
        // ignore malformed lines
      }
    }
  }
}
