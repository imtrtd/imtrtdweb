"use client";

import { useEffect, useRef, useState } from "react";

const EMAIL = "imtrtd@pm.me";
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent("Project enquiry — imtryingtodesign.com")}`;
const TELEGRAM = "https://t.me/imtrtd";
const HUB = "https://imtrtd.space";

const projects = [
  { n: "01", title: "NAMENLOS", type: "Tattoo studio / Booking", href: "/work/namenlos", note: "Identity-led booking flow with a raw visual language." },
  { n: "02", title: "NACHTWERK", type: "Event series / Tickets", href: "/work/nachtwerk", note: "An atmospheric event page built around line-ups and conversion." },
  { n: "03", title: "KIOSK 23", type: "Café / Local commerce", href: "/work/kiosk-23", note: "A compact digital home for a small space with a loud point of view." },
];

const services = [
  ["01", "Web design", "Visual systems, responsive interfaces and prototypes."],
  ["02", "Development", "Fast, accessible builds with clean interactions."],
  ["03", "Visualization", "Presentations, product concepts and visual systems from text."],
  ["04", "Care & evolution", "Launch support, improvements and new releases."],
];

const releases = [
  { version: "v1.5.0", date: "18.10.26", title: "Lite edition", items: ["aligned with the imtrtd.space visual system", "direct contact: email + Telegram", "mobile hero and type-scale pass"] },
  { version: "v1.4.0", date: "13.08.26", title: "Identity update", items: ["purple identity system", "Space Grotesk typography", "cleaner mobile brand treatment"] },
  { version: "v1.3.2", date: "31.07.26", title: "System polish", items: ["reduced motion mode", "mobile navigation pass", "sharper type rhythm"] },
  { version: "v1.3.0", date: "18.07.26", title: "Project archive", items: ["case-study grid", "service modules", "bilingual structure"] },
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

  const close = () => setMenuOpen(false);

  return (
    <main>
      <div className="cursor-glow" ref={glow} aria-hidden="true" />
      <div className="noise" aria-hidden="true" />
      {burst && <Confetti />}

      <header className="topbar">
        <a className="brand" href="#top" aria-label="ImTryingToDesign — home">
          <img className="brand-lockup" src="/brand/logo-lockup.svg" width={158} height={46} alt="" />
          <img className="brand-mark" src="/brand/logo-mark.svg" width={39} height={40} alt="" />
        </a>
        <div className="status mono"><i aria-hidden="true" /> Available · Q4 2026</div>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Main navigation">
          <a href="#work" onClick={close}>Work</a>
          <a href="#services" onClick={close}>Services</a>
          <a href="/systems" onClick={close}>Systems</a>
          <a href="#changelog" onClick={close}>Changelog</a>
          <a href="#contact" onClick={close}>Contact</a>
          <a className="nav-hub" href={HUB} onClick={close}>imtrtd.space <span aria-hidden="true">↗</span></a>
        </nav>
        <button className="menu mono" onClick={() => setMenuOpen(v => !v)} aria-expanded={menuOpen} aria-label="Toggle menu">{menuOpen ? "Close" : "Menu"}</button>
      </header>

      <section className="hero" id="top">
        <div className="orb" aria-hidden="true"><span /><span /><span /></div>
        <div className="hero-meta">
          <p className="label text-signal">ImTryingToDesign · lite</p>
          <p className="label text-mute">Web development · Kyiv / Remote</p>
        </div>
        <h1>
          <span>Digital</span>
          <span className="outline glitch" data-text="Experiences">Experiences</span>
          <span>with a pulse.</span>
        </h1>
        <div className="hero-bottom">
          <p>I design and build expressive websites, interfaces and digital systems for independent studios, artists and small brands that refuse to look generic.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={MAILTO} onClick={celebrate}>Start a project <span aria-hidden="true">↗</span></a>
            <a className="btn btn-ghost" href="#work">Explore work <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </section>

      <section className="manifesto section-pad" data-div="01 · What I do">
        <p className="label text-signal">What I do</p>
        <div>
          <h2>One person.<br />Full <em>system.</em></h2>
          <p className="lead">From first sketch to deployment: strategy, interface, code and motion developed as one continuous product system.</p>
          <p className="label text-mute">Design × Development × Visualization</p>
        </div>
      </section>

      <section className="projects" id="work" data-div="02 · Selected work">
        <div className="section-head section-pad">
          <p className="label text-signal">Selected work</p>
          <p className="label text-mute">03 concept cases</p>
        </div>
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.title}>
              <a className="project" href={project.href} aria-label={`Open ${project.title} concept case study`}>
                <span className="label text-signal">{project.n}</span>
                <span className="project-body">
                  <span className="label text-mute">{project.type}</span>
                  <span className="project-title">{project.title}</span>
                  <span className="project-note">{project.note}</span>
                </span>
                <span className="project-arrow" aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="work-archive section-pad">
          <p className="label text-mute">All case studies are clearly labeled concept / placeholder work. Live client builds are on <a href={`${HUB}/#work`}>imtrtd.space</a>.</p>
          <a className="btn btn-ghost" href="/systems">Reference systems <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="services section-pad" id="services" data-div="03 · Capabilities">
        <div>
          <p className="label text-signal">Capabilities</p>
          <h2>From idea<br />to <em>online.</em></h2>
        </div>
        <ul className="service-list">
          {services.map(([n, title, desc]) => (
            <li className="service" key={n}>
              <span className="label text-signal">{n}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="hub section-pad" data-div="04 · Full site">
        <div className="hub-card">
          <div>
            <p className="label text-signal">You’re on the lite edition</p>
            <h2>The full studio lives at <em>imtrtd.space.</em></h2>
            <p className="lead">Live builds, samples, practice and the brief form — the complete ImTryingToDesign site.</p>
          </div>
          <a className="btn btn-primary btn-lg" href={HUB}>Open imtrtd.space <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="changelog section-pad" id="changelog" data-div="05 · Build in public">
        <div className="change-intro">
          <p className="label text-signal">Build in public</p>
          <h2>Change log<span className="caret" aria-hidden="true">_</span></h2>
          <p className="lead">The site evolves with the work. This log tracks the visible product and design changes.</p>
        </div>
        <ol className="release-list">
          {releases.map((release, index) => (
            <li className="release" key={release.version}>
              <div className="release-version"><span className="label text-signal">{release.version}</span><time className="label text-mute">{release.date}</time></div>
              <div>
                <h3>{release.title}{index === 0 && <b className="badge">New</b>}</h3>
                <ul>{release.items.map(item => <li key={item}><span aria-hidden="true">+</span> {item}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="footer section-pad" id="contact" data-div="06 · Contact">
        <div className="footer-status label"><i aria-hidden="true" /> Accepting select projects · Q4 2026</div>
        <h2>Let&apos;s make<br /><span>something</span><br />unmissable.</h2>
        <div className="contact-grid">
          <a className="contact-card" href={MAILTO} onClick={celebrate}>
            <span className="label text-mute">Email</span>
            <span className="contact-value">{EMAIL}</span>
            <span className="contact-arrow" aria-hidden="true">↗</span>
          </a>
          <a className="contact-card" href={TELEGRAM} target="_blank" rel="noreferrer">
            <span className="label text-mute">Telegram</span>
            <span className="contact-value">@imtrtd</span>
            <span className="contact-arrow" aria-hidden="true">↗</span>
          </a>
          <a className="contact-card" href={`${HUB}/contact.html`}>
            <span className="label text-mute">Brief form</span>
            <span className="contact-value">imtrtd.space</span>
            <span className="contact-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="footer-row label">
          <a className="footer-brand" href="#top" aria-label="ImTryingToDesign — back to top"><img src="/brand/logo-lockup.svg" width={151} height={44} alt="" /></a>
          <span>© 2026 ImTryingToDesign</span>
          <span>Kyiv / Remote</span>
          <span className="footer-links">
            <a href={HUB}>imtrtd.space ↗</a>
            <a href="https://www.instagram.com/imtryingtodesign/" target="_blank" rel="noreferrer">Instagram ↗</a>
          </span>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </main>
  );
}

function Confetti() {
  return <div className="confetti" aria-hidden="true">{Array.from({ length: 32 }).map((_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>;
}
