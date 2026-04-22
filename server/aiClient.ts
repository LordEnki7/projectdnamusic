/**
 * Resilient AI Client — Groq → OpenAI fallback chain
 *
 * Pattern: always try the primary provider first. If it fails for any reason
 * (quota, outage, rate-limit), automatically retry on the fallback provider.
 * The calling code never needs to know which provider actually responded.
 *
 * Add more providers to the PROVIDERS array to extend the chain.
 */

import OpenAI from "openai";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AICompletionOptions {
  messages: AIMessage[];
  model?: "fast" | "powerful";  // "fast" = smaller model, "powerful" = largest available
  jsonMode?: boolean;
  maxTokens?: number;
}

interface Provider {
  name: string;
  client: OpenAI;
  models: { fast: string; powerful: string };
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "Groq",
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      models: {
        fast: "llama-3.1-8b-instant",
        powerful: "llama-3.3-70b-versatile",
      },
    });
  }

  const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (openaiKey) {
    providers.push({
      name: "OpenAI",
      client: new OpenAI({
        apiKey: openaiKey,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
      }),
      models: {
        fast: "gpt-4o-mini",
        powerful: "gpt-4o",
      },
    });
  }

  return providers;
}

const PROVIDERS = buildProviders();

/**
 * Call AI with automatic provider fallback.
 * Tries each provider in order until one succeeds.
 * Returns the text content of the response.
 */
export async function aiComplete(options: AICompletionOptions): Promise<string> {
  const { messages, model = "powerful", jsonMode = false, maxTokens = 2000 } = options;

  if (PROVIDERS.length === 0) {
    throw new Error("No AI providers configured. Set GROQ_API_KEY or OPENAI_API_KEY.");
  }

  let lastError: Error | null = null;

  for (const provider of PROVIDERS) {
    try {
      const modelName = provider.models[model];
      const params: any = {
        model: modelName,
        messages,
        max_tokens: maxTokens,
      };
      if (jsonMode) {
        params.response_format = { type: "json_object" };
      }

      const completion = await provider.client.chat.completions.create(params);
      const content = completion.choices[0]?.message?.content ?? "";

      if (process.env.NODE_ENV === "development") {
        console.log(`[AI] ${provider.name}/${modelName} responded OK`);
      }

      return content;
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI] ${provider.name} failed: ${err.message} — trying next provider...`);
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
}

/**
 * Convenience wrapper for JSON responses.
 * Parses the JSON and returns the object, falling back to {} on parse error.
 */
export async function aiCompleteJSON<T = any>(options: Omit<AICompletionOptions, "jsonMode">): Promise<T> {
  const raw = await aiComplete({ ...options, jsonMode: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn("[AI] JSON parse failed, returning empty object. Raw:", raw.slice(0, 200));
    return {} as T;
  }
}
