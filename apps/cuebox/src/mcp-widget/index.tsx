import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { VariableDef } from "@/lib/types";

interface PromptCardData {
  id: string;
  title: string;
  category: string;
  tags: string[];
  models: string[];
  variables: VariableDef[];
  values: Record<string, string>;
  filledPrompt: string;
  unresolved: string[];
  url: string;
}

interface ToolResult {
  structuredContent?: PromptCardData;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

function useToolResult() {
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data as {
        jsonrpc?: string;
        method?: string;
        params?: ToolResult;
      };
      if (!message || message.jsonrpc !== "2.0") return;
      if (message.method !== "ui/notifications/tool-result") return;
      setToolResult(message.params ?? null);
    };

    window.addEventListener("message", onMessage, { passive: true });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return toolResult;
}

function PromptCard() {
  const toolResult = useToolResult();
  const data = toolResult?.structuredContent;
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const requestId = useRef(1);
  const pending = useRef(new Map<number, PendingRequest>());

  useEffect(() => {
    const requests = pending.current;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data as {
        jsonrpc?: string;
        id?: number;
        result?: unknown;
        error?: unknown;
      };
      if (message?.jsonrpc !== "2.0" || message.id === undefined) return;
      const waiting = requests.get(message.id);
      if (!waiting) return;
      clearTimeout(waiting.timeout);
      requests.delete(message.id);
      if (message.error) waiting.reject(message.error);
      else waiting.resolve(message.result);
    };

    window.addEventListener("message", onMessage, { passive: true });
    return () => {
      window.removeEventListener("message", onMessage);
      for (const waiting of requests.values()) clearTimeout(waiting.timeout);
      requests.clear();
    };
  }, []);

  const variableSummary = useMemo(() => {
    if (!data) return [];
    return data.variables
      .map((variable) => ({
        label: variable.label || variable.key,
        value: data.values[variable.key] || "—",
      }))
      .filter((item) => item.value !== "—");
  }, [data]);

  async function bridgeRequest(method: string, params: unknown) {
    const id = requestId.current++;
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.current.delete(id);
        reject(new Error("Host did not respond"));
      }, 8000);
      pending.current.set(id, { resolve, reject, timeout });
    });
  }

  async function copyPrompt() {
    if (!data) return;
    await navigator.clipboard.writeText(data.filledPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function sendToChat() {
    if (!data) return;
    setSending(true);
    try {
      await bridgeRequest("ui/message", {
        role: "user",
        content: [{ type: "text", text: data.filledPrompt }],
      });
    } finally {
      setSending(false);
    }
  }

  if (!data) {
    return <main className="card loading">Готовим карточку Cuebox…</main>;
  }

  return (
    <main className="card">
      <header>
        <div>
          <p className="eyebrow">Cuebox · {data.category}</p>
          <h1>{data.title}</h1>
        </div>
        <span className="mark" aria-hidden>+</span>
      </header>

      <div className="chips" aria-label="Модели и теги">
        {data.models.slice(0, 3).map((model) => (
          <span className="chip model" key={model}>{model}</span>
        ))}
        {data.tags.slice(0, 3).map((tag) => (
          <span className="chip" key={tag}>{tag}</span>
        ))}
      </div>

      {variableSummary.length ? (
        <dl className="variables">
          {variableSummary.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {data.unresolved.length ? (
        <p className="notice">
          Нужны значения: {data.unresolved.join(", ")}
        </p>
      ) : null}

      <pre>{data.filledPrompt}</pre>

      <footer>
        <button type="button" className="secondary" onClick={() => void copyPrompt()}>
          {copied ? "Скопировано" : "Копировать"}
        </button>
        <button type="button" className="primary" disabled={sending} onClick={() => void sendToChat()}>
          {sending ? "Отправляем…" : "Использовать в чате"}
        </button>
      </footer>
    </main>
  );
}

const style = document.createElement("style");
style.textContent = `
  :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; color: CanvasText; background: transparent; }
  button { font: inherit; }
  .card { padding: 16px; min-height: 180px; }
  .loading { display: grid; place-items: center; color: color-mix(in srgb, CanvasText 65%, transparent); }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .eyebrow { margin: 0 0 5px; color: #8b5cf6; font-size: 12px; font-weight: 750; letter-spacing: .055em; text-transform: uppercase; }
  h1 { margin: 0; font-size: 20px; line-height: 1.2; }
  .mark { display: grid; place-items: center; width: 30px; height: 30px; flex: 0 0 auto; border-radius: 9px; background: #8b5cf6; color: #fff; font-size: 22px; font-weight: 600; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .chip { padding: 4px 8px; border: 1px solid color-mix(in srgb, CanvasText 16%, transparent); border-radius: 999px; font-size: 12px; color: color-mix(in srgb, CanvasText 72%, transparent); }
  .chip.model { border-color: color-mix(in srgb, #8b5cf6 44%, transparent); color: #8b5cf6; }
  .variables { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin: 14px 0 0; }
  .variables div { min-width: 0; padding: 9px 10px; border-radius: 10px; background: color-mix(in srgb, CanvasText 6%, transparent); }
  dt { font-size: 11px; color: color-mix(in srgb, CanvasText 58%, transparent); }
  dd { margin: 2px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
  .notice { margin: 12px 0 0; padding: 9px 10px; border-radius: 9px; background: color-mix(in srgb, #f59e0b 14%, transparent); color: color-mix(in srgb, CanvasText 82%, #f59e0b); font-size: 12px; }
  pre { max-height: 270px; margin: 14px 0 0; padding: 13px; overflow: auto; border: 1px solid color-mix(in srgb, CanvasText 12%, transparent); border-radius: 11px; background: color-mix(in srgb, CanvasText 4%, transparent); white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
  button { min-height: 38px; padding: 8px 12px; border-radius: 9px; border: 1px solid transparent; cursor: pointer; font-size: 13px; font-weight: 700; }
  button:disabled { cursor: wait; opacity: .65; }
  .secondary { border-color: color-mix(in srgb, CanvasText 18%, transparent); background: transparent; color: CanvasText; }
  .primary { background: #8b5cf6; color: white; }
  button:focus-visible { outline: 3px solid color-mix(in srgb, #8b5cf6 45%, transparent); outline-offset: 2px; }
  @media (max-width: 480px) { .card { padding: 12px; } footer { flex-direction: column-reverse; } button { width: 100%; } }
`;
document.head.append(style);

const root = document.getElementById("root");
if (root) createRoot(root).render(<PromptCard />);
