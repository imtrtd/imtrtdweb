"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const work = [
  {
    index: "01",
    title: "Namenlos",
    discipline: "Digital identity / Booking / Motion",
    description: "A raw, conversion-focused home for a tattoo studio that treats every interaction like a mark on skin.",
    image: "/project-night.svg",
    tone: "red",
    href: "mailto:admin@imtryingtodesign.com?subject=Project%20enquiry%20%E2%80%94%20Namenlos",
  },
  {
    index: "02",
    title: "Kiosk 23",
    discipline: "Strategy / Commerce / Art direction",
    description: "A compact digital system for a small place with a big personality—built for daily updates and repeat visits.",
    image: "/project-craft.svg",
    tone: "ivory",
    href: "mailto:admin@imtryingtodesign.com?subject=Project%20enquiry%20%E2%80%94%20Kiosk%2023",
  },
  {
    index: "03",
    title: "Nachtwerk",
    discipline: "Campaign / Tickets / Creative code",
    description: "A fast, atmospheric event platform where line-ups, rhythm and ticket conversion share the same pulse.",
    image: null,
    tone: "blue",
    href: "mailto:admin@imtryingtodesign.com?subject=Project%20enquiry%20%E2%80%94%20Nachtwerk",
  },
];

const services = [
  ["01", "Direction", "Positioning, visual language and a sharp digital point of view."],
  ["02", "Design", "Responsive interfaces, design systems and high-fidelity prototypes."],
  ["03", "Development", "Fast, accessible builds with expressive motion and clean code."],
  ["04", "Evolution", "Launch support, experiments and the next useful version."],
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

  return (
    <main id="top">
      <div className="page-progress" ref={progress} aria-hidden="true" />
      <div className="pointer-aura" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <header className="site-header">
        <a className="identity" href="#top" aria-label="ImTryingToDesign home" onClick={closeMenu}>
          <Logo />
          <span className="identity-word">IMTRYING<br />TO DESIGN</span>
        </a>
        <p className="availability"><i /> Independent digital studio <span>Kyiv / Everywhere</span></p>
        <nav id="site-nav" className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
          <a href="#work" onClick={closeMenu}>Work</a>
          <a href="#studio" onClick={closeMenu}>Studio</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
          <a className="nav-cta" href="mailto:admin@imtryingtodesign.com">Start a project <span>↗</span></a>
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
          <p className="kicker"><span>01</span> Design with intent.<br />Code with character.</p>
          <h1><span>WE MAKE</span><span className="hero-serif glitch" data-text="your idea">your idea</span><span>FEEL ALIVE.</span></h1>
          <div className="hero-intro">
            <p>Distinctive websites for ambitious brands worth noticing. Strategy, interface, code and motion—one continuous thought.</p>
            <a className="disc-link sphere-atom" href="#work" data-motion>
              <SphereOrbits />
              <span>View selected work</span>
              <b>↓</b>
            </a>
          </div>
        </div>

        <div className="hero-visual" data-reveal data-motion>
          <span className="visual-index">I/TD — 001</span>
          <div className="visual-figure">
            <img
              src="/studio-hero.png"
              alt="Abstract chrome and glass sculpture illuminated in cobalt and coral"
              width={1600}
              height={2000}
              decoding="async"
              fetchPriority="high"
              draggable={false}
            />
          </div>
          <span className="visual-caption">FORM / SYSTEM / ENERGY</span>
          <div className="orbit orbit-a" /><div className="orbit orbit-b" />
        </div>
        <p className="hero-side-note">SCROLL TO DISCOVER — 2026</p>
      </section>

      <div className="ticker" aria-label="Studio capabilities" data-motion><div>
        <span>ART DIRECTION</span><i>✦</i><span>WEB DESIGN</span><i>✦</i><span>CREATIVE DEVELOPMENT</span><i>✦</i><span>MOTION</span><i>✦</i>
        <span>ART DIRECTION</span><i>✦</i><span>WEB DESIGN</span><i>✦</i><span>CREATIVE DEVELOPMENT</span><i>✦</i><span>MOTION</span><i>✦</i>
      </div></div>

      <section className="statement section-shell" id="studio">
        <div className="section-label" data-reveal><span>02</span><p>Independent by design</p></div>
        <div className="statement-body" data-reveal>
          <h2>Small studio.<br />Unusually <em>big</em> energy.</h2>
          <div className="statement-note">
            <p>You work directly with the person shaping the idea and building the product. Less ceremony. Better decisions. A result that actually feels like you.</p>
            <span>One partner—from blank page to live URL.</span>
          </div>
        </div>
      </section>

      <section className="work section-shell" id="work">
        <div className="work-heading" data-reveal>
          <div className="section-label"><span>03</span><p>Selected work</p></div>
          <h2>Built to be<br /><em>remembered.</em></h2>
          <p className="work-count">03 / 2025—26</p>
        </div>
        <div className="project-grid">
          {work.map((project, index) => (
            <a
              className={`case case-${project.tone} ${index === 2 ? "case-wide" : ""}`}
              key={project.title}
              href={project.href}
              aria-label={`Open case ${project.title}`}
              data-reveal
              style={{ "--delay": `${index * 70}ms` } as CSSProperties}
            >
              <div className="case-media">
                {project.image ? (
                  <img
                    src={project.image}
                    alt=""
                    width={1600}
                    height={1200}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                ) : (
                  <div className="type-art" aria-hidden="true"><span>N</span><span>W</span><i /></div>
                )}
                <div className="case-no">/{project.index}</div>
                <div className="case-hover sphere-planet" data-motion>
                  <SphereOrbits count={2} />
                  <span>Open case</span>
                  <b>↗</b>
                </div>
              </div>
              <div className="case-info">
                <p>{project.discipline}</p><h3>{project.title}</h3><p className="case-description">{project.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="services section-shell" id="services">
        <div className="services-intro" data-reveal>
          <div className="section-label"><span>04</span><p>Capabilities</p></div>
          <h2>From first signal<br />to <em>full volume.</em></h2>
          <p>A joined-up process where strategy informs design, design anticipates code, and motion carries the idea through.</p>
        </div>
        <div className="service-list">
          {services.map(([number, title, description], index) => (
            <a className="service-row" key={number} href="mailto:admin@imtryingtodesign.com?subject=Project%20enquiry" data-reveal style={{ "--delay": `${index * 60}ms` } as CSSProperties} aria-label={`${title} — start a project`}>
              <span>{number}</span><h3>{title}</h3><p>{description}</p><b>↗</b>
            </a>
          ))}
        </div>
      </section>

      <section className="process section-shell">
        <div className="section-label" data-reveal><span>05</span><p>A clear way through</p></div>
        <div className="process-grid">
          {[["Discover", "Find the real opportunity and the sharpest story."], ["Define", "Turn strategy into a flexible visual and interaction system."], ["Deliver", "Build, refine, test and launch with care."]].map(([title, copy], index) => (
            <article data-reveal key={title} style={{ "--delay": `${index * 80}ms` } as CSSProperties}>
              <div className="process-head"><span>0{index + 1}</span><i /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="contact section-shell" id="contact">
        <div className="contact-top" data-reveal><p><i /> Booking selected projects<br />for Q4 2026</p><span>Kyiv / Remote<br />UTC +3</span></div>
        <div className="contact-main" data-reveal>
          <p>Have a project in mind?</p>
          <h2>LET&apos;S MAKE<br /><em>YOUR IDEA</em><br />UNMISSABLE.</h2>
          <a className="project-cta sphere-planet" href="mailto:admin@imtryingtodesign.com" data-motion>
            <SphereOrbits ring />
            <span>Start a project</span>
            <b>↗</b>
          </a>
        </div>
        <div className="contact-bottom">
          <Logo /><p>© 2026 IMTRYINGTODESIGN</p>
          <div>
            <a href="https://t.me/IMTRTD" target="_blank" rel="noreferrer">Telegram ↗</a>
            <a href="https://www.instagram.com/imtryingtodesign" target="_blank" rel="noreferrer">Instagram ↗</a>
            <a href="#top">Back to top ↑</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SphereOrbits({ count = 3, ring = false }: { count?: number; ring?: boolean }) {
  return (
    <span className="sphere-orbits" aria-hidden="true">
      {ring ? <em className="sphere-ring" /> : null}
      {Array.from({ length: count }, (_, index) => <i key={index} />)}
    </span>
  );
}

function Logo() {
  return <svg className="logo" viewBox="0 0 64 64" role="img" aria-label="ImTryingToDesign open signal mark">
    <path className="logo-frame" d="M13 26V13h13M13 38v13h13M51 26V13H38M51 38v13H38" />
    <path className="logo-slash" d="M38 8 26 56" />
    <circle className="logo-signal" cx="32" cy="32" r="3.5" />
  </svg>;
}
