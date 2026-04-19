/**
 * Minimal Ollama HTTP client with retry + JSON mode.
 * Uses the /api/chat endpoint. No external deps.
 */

const DEFAULT_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:14b-instruct";
const DEFAULT_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 90_000);

/**
 * Send a chat message and return the raw assistant text.
 * @param {object} opts
 * @param {string} opts.system
 * @param {string} opts.prompt
 * @param {string} [opts.model]
 * @param {string} [opts.baseUrl]
 * @param {boolean} [opts.json]   - force JSON output via format: "json"
 * @param {number}  [opts.temperature]
 * @param {number}  [opts.retries]
 */
export async function chat(opts) {
  const {
    system,
    prompt,
    model = DEFAULT_MODEL,
    baseUrl = DEFAULT_BASE,
    json = false,
    temperature = 0.1,
    retries = 2,
  } = opts;

  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    stream: false,
    options: { temperature, num_ctx: 8192 },
  };
  if (json) body.format = "json";

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ollama ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      return data?.message?.content ?? "";
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Check the ollama server is reachable and the model is available.
 * Returns { ok, detail } — never throws.
 */
export async function healthCheck({
  baseUrl = DEFAULT_BASE,
  model = DEFAULT_MODEL,
} = {}) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout?.(5000),
    });
    if (!res.ok) return { ok: false, detail: `tags ${res.status}` };
    const data = await res.json();
    const names = (data.models ?? []).map((m) => m.name);
    const hasModel = names.some((n) => n === model || n.startsWith(model + ":"));
    if (!hasModel) {
      return {
        ok: false,
        detail: `model "${model}" not pulled. Run: ollama pull ${model}`,
        available: names,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      detail:
        err instanceof Error ? err.message : "ollama not reachable at " + baseUrl,
    };
  }
}

/** Convenience: ask for structured JSON and parse. Throws on parse failure. */
export async function chatJson(opts) {
  const raw = await chat({ ...opts, json: true });
  // Some models wrap JSON in ```json blocks; strip defensively.
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(stripped);
}

export const DEFAULTS = {
  BASE_URL: DEFAULT_BASE,
  MODEL: DEFAULT_MODEL,
  TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
};
