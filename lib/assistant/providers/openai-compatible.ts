import "server-only";
import type { LlmProvider } from "./index";

/**
 * OpenAI-kompatible Chat-Completions-API (viele EU-Anbieter & Self-Hosting).
 * LLM_BASE_URL – z. B. https://openai.inference.de-txl.ionos.com/v1 oder http://localhost:11434/v1
 * LLM_API_KEY  – optional bei Self-Hosting
 * LLM_MODEL    – Modellname beim Anbieter
 */
export function openAiCompatibleProvider(): LlmProvider | null {
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!base || !model) {
    console.warn("[assistent] ASSISTANT_PROVIDER=openai-compatible, aber LLM_BASE_URL oder LLM_MODEL fehlt.");
    return null;
  }
  return {
    name: "openai-compatible",
    async complete(system, messages) {
      const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.LLM_API_KEY ? { authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 800,
          messages: [{ role: "system", content: system }, ...messages],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`LLM API ${res.status}`);
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content ?? "";
    },
  };
}
