// Ollama Cloud AI integration
// Native /api/chat endpoint (NOT /v1/chat/completions — that returns 401 with Ollama Cloud keys)
import "server-only";

const DEFAULT_BASE = "https://api.ollama.com";
// Use qwen3-coder:480b as default — it returns content directly without
// the "thinking" field behavior of kimi-k2.6, and doesn't trigger
// Cloudflare 1010 blocks for JSON generation tasks.
const DEFAULT_MODEL = "qwen3-coder:480b";

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
      stream: false,
      options: {
        temperature: options.temperature ?? 0.4,
        num_predict: options.maxTokens ?? 2048,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  let raw = data.message?.content ?? "";
  const thinking = data.message?.thinking ?? "";

  // Strategy: kimi-k2.6 often streams its REASONING in content and the actual
  // ANSWER in the thinking field. So we need to try multiple strategies:
  //  1. If content has JSON, use it.
  //  2. If thinking has JSON, use it.
  //  3. If content looks like prose (long, no JSON), prefer thinking.
  //  4. Fall back to content.
  const hasJson = (s: string) => /\{[\s\S]*\}/.test(s);
  const contentIsJson = hasJson(raw);
  const thinkingIsJson = hasJson(thinking);

  if (contentIsJson && !thinkingIsJson) {
    // content has JSON, thinking doesn't — use content
  } else if (thinkingIsJson && !contentIsJson) {
    // thinking has JSON, content doesn't — use thinking
    raw = thinking;
  } else if (contentIsJson && thinkingIsJson) {
    // both have JSON — prefer content (the more "official" channel)
  } else {
    // neither has JSON — prefer thinking for reasoning models
    if (thinking.trim() && !raw.trim()) {
      raw = thinking;
    } else if (thinking.trim() && raw.length < 200) {
      // content is short stub; thinking is likely the full answer
      raw = thinking;
    }
  }

  if (!raw.trim() && Array.isArray(data.message?.content)) {
    raw = data.message.content.map((c: any) => c.text ?? "").join("");
  }
  if (!raw.trim()) {
    throw new Error("Ollama returned empty content. Full response: " + JSON.stringify(data).slice(0, 300));
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
