"use client";

import { useEffect, useRef, useState } from "react";

const projects = [
  { n: "01", title: "NAMENLOS", type: "TATTOO STUDIO / BOOKING", color: "acid", note: "Identity-led website that turns a raw visual language into a clear booking flow." },
  { n: "02", title: "NACHTWERK", type: "EVENT SERIES / TICKETS", color: "violet", note: "Fast, atmospheric event page built around line-ups, motion and conversion." },
  { n: "03", title: "KIOSK 23", type: "CAFÉ / LOCAL COMMERCE", color: "orange", note: "A compact digital home for a small space with a loud point of view." },
];

const releases = [
  { version: "v1.4.0", date: "08.08.26", title: "IMMERSION UPDATE", items: ["cursor-reactive light field", "project reveal transitions", "confetti contact trigger"] },
  { version: "v1.3.2", date: "31.07.26", title: "SYSTEM POLISH", items: ["reduced motion mode", "mobile navigation pass", "sharper type rhythm"] },
  { version: "v1.3.0", date: "18.07.26", title: "PROJECT ARCHIVE", items: ["case-study grid", "service modules", "bilingual structure"] },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!glow.current) return;
      glow.current.style.setProperty("--x", `${event.clientX}px`);
      glow.current.style.setProperty("--y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const celebrate = () => {
    setBurst(false);
    requestAnimationFrame(() => setBurst(true));
    window.setTimeout(() => setBurst(false), 1600);
  };

  return (
    <main>
      <div className="cursor-glow" ref={glow} aria-hidden="true" />
      <div className="noise" aria-hidden="true" />
      {burst && <Confetti />}

      <header className="topbar">
        <a className="brand" href="#top" aria-label="ImTryingToDesign home">
          <span className="brand-mark">I/TD</span>
          <span>IMTRYINGTO<br />DESIGN.COM</span>
        </a>
        <div className="status"><i /> AVAILABLE FOR Q4 <span>2026</span></div>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Main navigation">
          <a href="#work" onClick={() => setMenuOpen(false)}>WORK</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>SERVICES</a>
          <a href="#changelog" onClick={() => setMenuOpen(false)}>CHANGELOG</a>
          <a href="mailto:admin@imtryingtodesign.com">CONTACT ↗</a>
        </nav>
        <button className="menu" onClick={() => setMenuOpen(v => !v)} aria-expanded={menuOpen} aria-label="Toggle menu">{menuOpen ? "CLOSE" : "MENU"}</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-meta mono">INDEPENDENT WEB DEVELOPMENT<br />KYIV / REMOTE / 50.4501° N</div>
        <div className="orb" aria-hidden="true"><span /><span /><span /></div>
        <h1><span>DIGITAL</span><span className="outline glitch" data-text="EXPERIENCES">EXPERIENCES</span><span>WITH A PULSE.</span></h1>
        <div className="hero-bottom">
          <p>I design and build expressive websites for independent studios, cafés, artists and small brands that refuse to look generic.</p>
          <a className="round-link" href="#work" aria-label="Explore selected work">EXPLORE<br />WORK <b>↓</b></a>
        </div>
        <div className="scroll-code mono">SCROLL_TO_EXPLORE [000—100]</div>
      </section>

      <section className="manifesto section-pad">
        <p className="eyebrow">// WHAT I DO</p>
        <h2>SMALL TEAM.<br />BIG <em>ENERGY.</em></h2>
        <div className="manifesto-copy">
          <p>No bloated agency process. One person from first sketch to final deployment—strategy, interface, code and motion in one continuous system.</p>
          <span className="mono">[ DESIGN × DEVELOPMENT × DIRECTION ]</span>
        </div>
      </section>

      <section className="projects" id="work">
        <div className="section-head section-pad"><p className="eyebrow">// SELECTED WORK</p><span className="mono">03 CASES / 2025—26</span></div>
        {projects.map((project) => (
          <article className={`project ${project.color}`} key={project.title} tabIndex={0}>
            <span className="project-number mono">/{project.n}</span>
            <div><p className="mono">{project.type}</p><h3>{project.title}</h3></div>
            <p className="project-note">{project.note}</p>
            <span className="project-arrow">↗</span>
          </article>
        ))}
      </section>

      <section className="services section-pad" id="services">
        <div><p className="eyebrow">// CAPABILITIES</p><h2>FROM ZERO<br />TO <span>ONLINE.</span></h2></div>
        <div className="service-list">
          {[['01','WEB DESIGN','Visual systems, responsive interfaces and prototypes.'],['02','DEVELOPMENT','Fast, accessible builds with clean interactions.'],['03','CREATIVE DIRECTION','A coherent digital voice, not another template.'],['04','CARE & EVOLUTION','Launch support, improvements and new releases.']].map(([n,title,desc]) => <div className="service" key={n}><b>{n}</b><h3>{title}</h3><p>{desc}</p></div>)}
        </div>
      </section>

      <section className="changelog section-pad" id="changelog">
        <div className="terminal-title"><div><i /><i /><i /></div><span className="mono">~/imtryingtodesign/changelog.log</span><span className="mono">LIVE</span></div>
        <div className="change-intro"><p className="eyebrow">// BUILD IN PUBLIC</p><h2>CHANGE<br /><span>LOG_</span></h2><p>Websites are never truly finished. Here’s what changed, what improved and what shipped.</p></div>
        <div className="release-list">
          {releases.map((release, index) => <article className="release" key={release.version}>
            <div className="release-version"><span>{release.version}</span><time>{release.date}</time></div>
            <div><h3>{release.title}{index === 0 && <b>NEW</b>}</h3>{release.items.map(item => <p key={item}><span>+</span> {item}</p>)}</div>
          </article>)}
        </div>
      </section>

      <footer className="footer section-pad" id="contact">
        <div className="footer-status mono"><i /> ACCEPTING SELECT PROJECTS / Q4 2026</div>
        <p className="eyebrow">// HAVE A PROJECT?</p>
        <h2>LET&apos;S MAKE<br /><span>SOMETHING</span><br />UNMISSABLE.</h2>
        <a className="contact-button" href="mailto:admin@imtryingtodesign.com" onClick={celebrate}>START A PROJECT <span>↗</span></a>
        <div className="footer-row mono">
          <span>© 2026 IMTRYINGTODESIGN</span>
          <span>KYIV / REMOTE</span>
          <div className="footer-contacts mono">
            <a href="https://t.me/IMTRTD" target="_blank" rel="noopener noreferrer">TG: @IMTRTD</a>
            <a href="tel:+19733815151">+1 973 381 5151</a>
            <a href="https://www.instagram.com/imtryingtodesign" target="_blank" rel="noopener noreferrer">IG: @IMTRYINGTODESIGN</a>
            <a href="#top">BACK TO TOP ↑</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Confetti() {
  return <div className="confetti" aria-hidden="true">{Array.from({ length: 32 }).map((_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>;
}
