"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { HeroFigure } from "./hero-figure";
import { BrandLockup } from "./logo";
import { PulseControl } from "./pulse-audio";

const nav = [
  ["// WORK", "#work"],
  ["// STUDIO", "#studio"],
  ["// SERVICES", "#services"],
  ["// LOG", "#changelog"],
  ["// CONTACT", "#contact"],
] as const;

const services = [
  ["SYS_UX_ENGINE_A", "DIRECTION", "Positioning, visual language and a sharp digital point of view — mapped to precision user paths."],
  ["SYS_WEBGL_CORE", "DESIGN", "Responsive interfaces, design systems and high-fidelity prototypes with motion that carries the idea."],
  ["SYS_BRAND_MODEL", "DEVELOPMENT", "Fast, accessible builds. WebGL, creative code and production systems without fluff."],
  ["SYS_TOKEN_COMPILER", "EVOLUTION", "Launch support, experiments and the next useful version — tokens, compilers, live product."],
];

const work = [
  {
    code: "PROJECT_01",
    client: "NAMENLOS",
    title: "NAMENLOS",
    description: "A raw, conversion-focused home for a tattoo studio that treats every interaction like a mark on skin.",
    image: "/project-night.svg",
    href: "mailto:admin@imtryingtodesign.com?subject=Project%20enquiry%20%E2%80%94%20Namenlos",
  },
  {
    code: "PROJECT_02",
    client: "KIOSK 23",
    title: "KIOSK 23",
    description: "A compact digital system for a small place with a big personality—built for daily updates and repeat visits.",
    image: "/project-craft.svg",
    href: "mailto:admin@imtryingtodesign.com?subject=Project%20enquiry%20%E2%80%94%20Kiosk%2023",
  },
  {
    code: "PROJECT_03",
    client: "NACHTWERK",
    title: "NACHTWERK",
    description: "A fast, atmospheric event platform where line-ups, rhythm and ticket conversion share the same pulse.",
    image: null,
    href: "mailto:admin@imtryingtodesign.com?subject=Project%20enquiry%20%E2%80%94%20Nachtwerk",
  },
];

const phases = [
  ["PHASE_01", "DISCOVER", "We audit and define structural bounds before writing code."],
  ["PHASE_02", "DESIGN", "Asymmetrical visual grids styled to match high-precision targets."],
  ["PHASE_03", "BUILD", "Pure engineering leveraging high-performance asset compilers."],
  ["PHASE_04", "DELIVER", "Strict testing schedules with zero compile leaks or layout shifts."],
];

const releases = [
  { version: "v2.0.1", date: "20.08.26", title: "HYBRID MIX", items: ["WE MAKE / YOUR IDEA / FEEL ALIVE restored", "glass sculpture + refracted monolith", "orb CTAs inside the I/TD system chrome"] },
  { version: "v1.5.1", date: "20.08.26", title: "ORIGINAL IDENTITY", items: ["full IMTRYINGTODESIGN.COM banner", "lime I/TD clipped-rectangle favicon", "original PNG in artifacts/"] },
  { version: "v1.5.0", date: "20.08.26", title: "PULSE MIX", items: ["live changelog", "glitch + original DnB pulse"] },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.toggle("nav-lock", menuOpen);
    return () => document.body.classList.remove("nav-lock");
  }, [menuOpen]);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    let frame = 0;
    let pointerFrame = 0;

    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (progress.current) progress.current.style.transform = `scale3d(${ratio}, 1, 1)`;
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateScroll);
    };
    const onPointer = (event: PointerEvent) => {
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        root.style.setProperty("--mx", `${event.clientX}px`);
        root.style.setProperty("--my", `${event.clientY}px`);
        root.style.setProperty("--px", String((event.clientX / window.innerWidth - 0.5) * 2));
        root.style.setProperty("--py", String((event.clientY / window.innerHeight - 0.5) * 2));
        pointerFrame = 0;
      });
    };

    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.08, rootMargin: "0px 0px -8%" },
    );
    const motion = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => entry.target.classList.toggle("is-playing", entry.isIntersecting && !reduce.matches)),
      { threshold: 0.12 },
    );

    document.querySelectorAll("[data-reveal]").forEach((node) => reveal.observe(node));
    document.querySelectorAll("[data-motion]").forEach((node) => motion.observe(node));
    window.addEventListener("scroll", onScroll, { passive: true });
    if (!coarse.matches && !reduce.matches) {
      window.addEventListener("pointermove", onPointer, { passive: true });
    }
    updateScroll();

    return () => {
      reveal.disconnect();
      motion.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      if (frame) cancelAnimationFrame(frame);
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const onCompose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const scope = String(data.get("scope") ?? "");
    const body = encodeURIComponent(`IDENT_NAME: ${name}\nIDENT_EMAIL: ${email}\nIDENT_SCOPE: ${scope}`);
    window.location.href = `mailto:admin@imtryingtodesign.com?subject=${encodeURIComponent("Compile Project Proposal")}&body=${body}`;
  };

  return (
    <main id="top">
      <div className="page-progress" ref={progress} aria-hidden="true" />
      <div className="pointer-aura" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <header className="site-header">
        <a className="identity" href="#top" aria-label="ImTryingToDesign home" onClick={closeMenu}>
          <BrandLockup />
        </a>
        <nav id="site-nav" className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
          {nav.map(([label, href]) => (
            <a key={href} href={href} onClick={closeMenu}>{label}</a>
          ))}
          <div className="nav-actions">
            <p className="status-pill"><i /> ITD_ENGINE: ONLINE</p>
            <PulseControl />
            <a className="btn-fill" href="mailto:admin@imtryingtodesign.com" onClick={closeMenu}>Start Workspace</a>
          </div>
        </nav>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>

      <section className="hero">
        <div className="hero-copy" data-reveal>
          <p className="eyebrow"><i /><span>CREATIVE DEVELOPER STUDIO</span></p>
          <h1>
            <span>WE MAKE</span>
            <span className="hero-serif glitch" data-text="your idea">your idea</span>
            <span>FEEL ALIVE.</span>
          </h1>
          <p className="hero-lede">
            Distinctive websites for ambitious brands worth noticing. Strategy, interface, code and motion — one continuous thought, compiled as a system.
          </p>
          <div className="hero-cta-group">
            <a className="disc-link sphere-atom" href="#work" data-motion>
              <SphereShell />
              <span>View selected work</span>
              <b>↓</b>
            </a>
            <a className="project-cta sphere-planet hero-planet" href="mailto:admin@imtryingtodesign.com" data-motion>
              <SphereShell count={3} ring />
              <span>Start a project</span>
              <b>↗</b>
            </a>
          </div>
          <div className="hero-metrics">
            <div><b>24</b><span>// ACTIVE NODES</span></div>
            <div><b>99.9%</b><span>// SYSTEM UPTIME</span></div>
            <div><b>4.8M+</b><span>// RENDERED PIXELS</span></div>
          </div>
        </div>
        <HeroFigure />
      </section>

      <div className="phase-ticker" aria-label="Development phases" data-motion>
        {["DISCOVER", "DESIGN", "BUILD", "DELIVER"].map((step, index) => (
          <p key={step}><b>{step}</b><span>// SYS_STP_0{index + 1}</span></p>
        ))}
      </div>

      <section className="section-shell" id="studio">
        <SectionHead index="01" title="Manifesto" coord="SYS_COORD_001.99" />
        <div className="manifesto" data-reveal>
          <h2>WE BELIEVE<br />THAT BEAUTIFUL<br />SYSTEMS DO NOT<br />HAVE TO BE WEAK.</h2>
          <div>
            <p>Small studio. Unusually big energy. You work directly with the person shaping the idea and building the product. Less ceremony. Better decisions. A result that actually feels like you — and still compiles like a system.</p>
            <p className="lime-line">[ // REFINED BRAND IDENTITY BRIDGES DEEP DEVELOPMENT WITH HI-FI GRAPHIC PRECISION ]</p>
            <div className="hero-metrics">
              <div><b>0.01ms</b><span>LATENCY THRESHOLD</span></div>
              <div><b>100%</b><span>PIXEL PERFECT</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell" id="services">
        <SectionHead index="02" title="Services" coord="SYS_COORD_002.99" />
        <div className="service-grid">
          {services.map(([code, title, copy], index) => (
            <article className="panel" key={code} data-reveal style={{ "--delay": `${index * 60}ms` } as CSSProperties}>
              <div className="panel-top"><span>[ {code} ]</span><i /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell" id="engine">
        <SectionHead index="03" title="Interactive Engine Specs" coord="SYS_COORD_003.99" />
        <div className="engine-frame" data-reveal>
          <div>
            <p className="engine-dots"><i /><i /><i /> ITD.ENGINE_MAIN.TS</p>
            <pre className="engine-code">{`import { createRefractedMonolith } from 'itd-core'

const workspace = createRefractedMonolith({
  accent: '#D8FF00',
  planarShearAngle: 45,
  fidelity: 'EXTREME',
  gridAlign: true
});
// Running workspace compilation... OK`}</pre>
            <h3>ITD.ENGINE v2.0</h3>
            <p>Our custom state-token pipeline compiles strict layout parameters into clean vector and layout outputs. Extreme efficiency with no third-party framework overhead.</p>
          </div>
          <div className="engine-stage">
            <MonolithPlate size="engine" />
            <span>YOUR IDEA</span>
          </div>
        </div>
      </section>

      <section className="section-shell" id="work">
        <SectionHead index="04" title="Selected Works" coord="SYS_COORD_004.99" />
        <div className="work-stack">
          {work.map((project, index) => (
            <a className="work-card" key={project.title} href={project.href} data-reveal style={{ "--delay": `${index * 70}ms` } as CSSProperties}>
              <div className="work-media">
                {project.image ? (
                  <img src={project.image} alt="" width={800} height={560} loading="lazy" decoding="async" />
                ) : (
                  <div className="type-art" aria-hidden="true"><span>N</span><span>W</span></div>
                )}
              </div>
              <div>
                <p className="work-meta"><span>// {project.code}</span><span>CLIENT: {project.client}</span></p>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <span className="work-open">Open case ↗</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="section-shell" id="process">
        <SectionHead index="05" title="Development Process" coord="SYS_COORD_005.99" />
        <div className="process-grid">
          {phases.map(([code, title, copy], index) => (
            <article className="panel" key={code} data-reveal style={{ "--delay": `${index * 70}ms` } as CSSProperties}>
              <div className="panel-top"><span>// {code}</span><i className="tech-bullet" /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell" id="changelog">
        <SectionHead index="06" title="Sandbox Log" coord="SYS_COORD_006.99" />
        <div className="terminal-title" data-reveal>
          <div><i /><i /><i /></div>
          <span>~/imtryingtodesign/changelog.log</span>
          <span className="terminal-live">LIVE</span>
        </div>
        <div className="release-list">
          {releases.map((release, index) => (
            <article className="release" data-reveal key={release.version} style={{ "--delay": `${index * 70}ms` } as CSSProperties}>
              <div className="release-version"><span>{release.version}</span><time>{release.date}</time></div>
              <div>
                <h3>{release.title}{index === 0 ? <b>NEW</b> : null}</h3>
                {release.items.map((item) => <p key={item}><span>+</span> {item}</p>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell" id="contact">
        <SectionHead index="07" title="Workspace Composer" coord="SYS_COORD_007.99" />
        <div className="composer" data-reveal>
          <div>
            <h2>LET&apos;S MAKE<br /><em>YOUR IDEA</em><br />UNMISSABLE.</h2>
            <p>Have a project in mind? Configure the composer — or just hit send. Booking selected projects for Q4 2026.</p>
            <p className="stations">GLOBAL STATIONS:</p>
            <p className="station-line">EST_EET +3 / KYIV, UA</p>
            <p className="station-line">REMOTE / EVERYWHERE</p>
          </div>
          <form className="composer-form" onSubmit={onCompose}>
            <label>
              IDENT_NAME //
              <input name="name" type="text" required placeholder="Enter full name or entity..." />
            </label>
            <label>
              IDENT_EMAIL //
              <input name="email" type="email" required placeholder="Enter contact email address..." />
            </label>
            <label>
              IDENT_SCOPE //
              <select name="scope" defaultValue="UI/UX DESIGN + DEVELOPMENT">
                <option>UI/UX DESIGN + DEVELOPMENT</option>
                <option>BRAND SYSTEM DESIGN</option>
                <option>CREATIVE DEVELOPMENT</option>
                <option>DESIGN ENGINEERING</option>
              </select>
            </label>
            <button className="btn-fill btn-block" type="submit">Compile Project Proposal</button>
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <a className="identity" href="#top" aria-label="ImTryingToDesign home"><BrandLockup /></a>
          <p>High-precision design and implementation pipeline for technical companies worldwide. Structured visually, built optimally.</p>
        </div>
        <div className="footer-cols">
          <div>
            <p>[ SYSTEM ]</p>
            <a href="#engine">ITD.ENGINE</a>
            <a href="#changelog">Sandbox</a>
            <a href="#studio">Philosophy</a>
          </div>
          <div>
            <p>[ WORKS ]</p>
            <a href="#work">Selected work</a>
            <a href="https://t.me/IMTRTD" target="_blank" rel="noreferrer">Telegram</a>
            <a href="https://www.instagram.com/imtryingtodesign" target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SphereShell({ count = 3, ring = false }: { count?: number; ring?: boolean }) {
  return (
    <>
      <span className="sphere-body" aria-hidden="true" />
      <span className="sphere-orbits" aria-hidden="true">
        {ring ? <em className="sphere-ring" /> : null}
        {Array.from({ length: count }, (_, index) => <i key={index} />)}
      </span>
    </>
  );
}

function SectionHead({ index, title, coord }: { index: string; title: string; coord: string }) {
  return (
    <div className="section-head" data-reveal>
      <p><span>[ {index} ]</span> {title}</p>
      <i /><small>{coord}</small>
    </div>
  );
}
