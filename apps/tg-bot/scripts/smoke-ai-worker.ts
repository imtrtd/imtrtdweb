/**
 * Minimal Worker used only by `npm run smoke:ai`.
 * Calls the same AI binding + request shape as production chat/plan code.
 */
export interface Env {
  AI: Ai;
  AI_MODEL: string;
}

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    const model = env.AI_MODEL || "@cf/openai/gpt-oss-20b";
    const extras = String(model).startsWith("@cf/openai/gpt-oss-")
      ? { reasoning_effort: "low" as const }
      : {};

    try {
      const out: any = await env.AI.run(model as any, {
        messages: [
          {
            role: "system",
            content: "Reply with exactly the word OK and nothing else.",
          },
          { role: "user", content: "ping" },
        ],
        max_tokens: 64,
        temperature: 0,
        ...extras,
      } as any);

      const text = (
        typeof out === "string"
          ? out
          : (out?.response ?? out?.choices?.[0]?.message?.content ?? "")
      ).trim();

      if (!text) {
        return Response.json({ ok: false, error: "empty", out }, { status: 500 });
      }
      return Response.json({ ok: true, model, text: text.slice(0, 200) });
    } catch (error) {
      return Response.json(
        { ok: false, error: String((error as Error)?.message ?? error) },
        { status: 500 },
      );
    }
  },
};
