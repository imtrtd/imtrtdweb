export class TgError extends Error {
  constructor(public method: string, public code: number, public description: string) {
    super(`${method}: ${code} ${description}`);
  }
}

/** Minimal Telegram Bot API client. Never logs the token. */
export class TG {
  constructor(private token: string) {}

  async call<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const r = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
    let j: any;
    try { j = await r.json(); } catch { throw new TgError(method, r.status, "bad response"); }
    if (!j.ok) throw new TgError(method, j.error_code ?? r.status, j.description ?? "unknown error");
    return j.result as T;
  }

  /** Like call() but returns null on error (logged without secrets). */
  async try<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T | null> {
    try { return await this.call<T>(method, params); }
    catch (e) { console.warn(String((e as Error).message)); return null; }
  }
}

export function esc(s: string | undefined | null): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function userName(u: any): string {
  if (!u) return "?";
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || (u.username ? "@" + u.username : String(u.id));
}

export function mentionHtml(id: number, name: string): string {
  return `<a href="tg://user?id=${id}">${esc(name)}</a>`;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
