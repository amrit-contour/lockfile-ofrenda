import type { RegistryFacts } from "./registry.ts";
import { groundEulogy, templateEulogy } from "./ground.ts";

const OLLAMA = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(
  /\/+$/,
  "",
);
const MODEL = process.env.GHOST_MODEL ?? "gemma3:4b";

type EulogyResult = {
  text: string;
  source: "gemma" | "record";
  dropped: string[];
  model: string;
};

export async function writeEulogy(facts: RegistryFacts): Promise<EulogyResult> {
  const fallback = templateEulogy(facts);
  const prompt = [
    "Write a short remembrance (90-140 words) for an npm package on an ofrenda.",
    "You may only use the JSON facts. Do not invent successors, CVEs, people, or dates.",
    "If a field is missing, say the record is silent there. No advice to 'just upgrade' unless the deprecated field names a replacement.",
    "Tone: precise, a little wry, never cruel. No markdown.",
    JSON.stringify(facts),
  ].join("\n");

  try {
    const response = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        options: { temperature: 0.2, num_predict: 280 },
        messages: [
          {
            role: "system",
            content:
              "You are a clerk of a death register for software. You copy the record. You do not decorate it with new facts.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      return { text: fallback, source: "record", dropped: [], model: MODEL };
    }
    const json = (await response.json()) as {
      message?: { content?: string };
    };
    const raw = json.message?.content?.trim() ?? "";
    const grounded = groundEulogy(raw, facts);
    if (grounded.refused) {
      return {
        text: fallback,
        source: "record",
        dropped: grounded.dropped,
        model: MODEL,
      };
    }
    return {
      text: grounded.text,
      source: "gemma",
      dropped: grounded.dropped,
      model: MODEL,
    };
  } catch {
    return { text: fallback, source: "record", dropped: [], model: MODEL };
  }
}
