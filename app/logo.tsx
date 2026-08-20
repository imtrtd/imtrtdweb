"use client";

import { useState } from "react";

const MARK = "/mark.png?v=10";

export function MiniLogo() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="mini-logo mini-logo-fallback" aria-hidden="true">I/TD</span>;
  }
  return (
    <img
      className="mini-logo"
      src={MARK}
      alt=""
      width={64}
      height={64}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup">
      <MiniLogo />
      <span className="brand-copy">
        <b>{compact ? "imtryingtodesign" : "IMTRYING TO DESIGN"}</b>
        {compact ? null : <small>I/TD SYSTEM · KYIV / EVERYWHERE</small>}
      </span>
    </span>
  );
}

export function MonolithPlate({ size = "hero" }: { size?: "hero" | "engine" }) {
  return (
    <div className={`monolith-plate monolith-${size}`}>
      <span className="monolith-inner" aria-hidden="true" />
      <strong>I/TD</strong>
      <span className="monolith-coords">SYS_REF_01</span>
    </div>
  );
}
