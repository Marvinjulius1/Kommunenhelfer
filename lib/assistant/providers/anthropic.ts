import "server-only";
import type { LlmProvider } from "./index";

/**
 * Anthropic Messages API.
 * ANTHROPIC_API_KEY  – Pflicht
 * ANTHROPIC_MODEL    – optional (Standard: claude-sonnet-5-5)
 * ANTHROPIC_BASE_URL – optional, z. B. für einen Proxy/Gateway in der EU
 */
export function anthropicProvider(): LlmProvider | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn("[assistent] ASSISTANT_PROVIDER=anthropic, aber ANTHROPIC_API_KEY fehlt.");
    return null;
  }
  const base = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  return {
    name: "anthropic",
    async complete(system, messages) {
      const res = await fetch(`${base}/v1/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 800, temperature: 0, system, messages }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
      const data = (await res.json()) as { content: { type: string; text?: string }[] };
      return data.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    },
  };
}
