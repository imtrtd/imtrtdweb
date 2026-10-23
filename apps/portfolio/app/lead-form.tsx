"use client";

import { useState } from "react";

// Same public endpoint the imtrtd.space brief forms use. It stores the lead and pings the Telegram bot.
export const LEADS_ENDPOINT = "https://admin.imtrtd.space/api/leads";
const SOURCE = "imtryingtodesign.com/";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "ok"; contact: string } | { kind: "err"; text: string; mailto?: string };

export default function LeadForm({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const payload = {
      name: get("name"),
      contact: get("contact"),
      message: get("message"),
      budget: get("budget"),
      task_type: "Lite site brief",
      website: get("website"),
      source: SOURCE,
    };
    if (!payload.name || !payload.contact) {
      setStatus({ kind: "err", text: "Name and a way to reach you. Telepathy is still in beta." });
      return;
    }
    const mailto = `mailto:${email}?subject=${encodeURIComponent("Project enquiry — imtryingtodesign.com")}&body=${encodeURIComponent(`${payload.message}\n\n${payload.name}\n${payload.contact}`.trim())}`;
    setStatus({ kind: "sending" });
    try {
      const res = await fetch(LEADS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit",
        mode: "cors",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const text = res.status === 429 ? "Too many tries. Breathe, wait a minute." : `Not sent${body.error ? `: ${body.error}` : "."}`;
        setStatus({ kind: "err", text, mailto });
        return;
      }
      form.reset();
      setStatus({ kind: "ok", contact: payload.contact });
    } catch {
      setStatus({ kind: "err", text: "The server ghosted us.", mailto });
    }
  }

  const busy = status.kind === "sending";

  return (
    <div className="brief" id="brief">
      <div className="brief-intro">
        <p className="label text-signal">Brief form</p>
        <h3>Tell me what to build.</h3>
        <p>Three lines beat a forty-page PDF. I read every brief myself and answer within a working day — even the ambitious ones.</p>
      </div>
      <form className="brief-form" onSubmit={onSubmit} noValidate>
        <label>
          <span className="label">Name</span>
          <input name="name" autoComplete="name" required maxLength={120} placeholder="What should I call you?" />
        </label>
        <label>
          <span className="label">Email / Telegram</span>
          <input name="contact" autoComplete="email" required maxLength={200} placeholder="@handle or you@mail.com" />
        </label>
        <label className="wide">
          <span className="label">Project</span>
          <textarea name="message" rows={5} maxLength={3800} placeholder="What it is, who it’s for, when you need it. “Make it pop” is not a spec." />
        </label>
        <label>
          <span className="label">Budget <em>optional</em></span>
          <input name="budget" maxLength={120} placeholder="A number, a range, or “let’s talk”" />
        </label>
        <input className="brief-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="brief-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send brief"} <span aria-hidden="true">↗</span></button>
          <p className="label text-mute">Used only to reply. Never shared, never sold.</p>
        </div>
        <p className="brief-status" role="status" aria-live="polite" data-kind={status.kind}>
          {status.kind === "ok" && <><b>Sent.</b> I’ll answer at {status.contact} within a working day.</>}
          {status.kind === "err" && <><b>{status.text}</b>{status.mailto && <> <a href={status.mailto}>Email it instead</a>.</>}</>}
        </p>
      </form>
    </div>
  );
}
