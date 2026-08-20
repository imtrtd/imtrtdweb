import { MonolithPlate } from "./logo";

export function HeroFigure() {
  return (
    <aside className="hero-showcase" data-motion>
      <p className="hero-showcase-kicker">[ HERO EMBLEM LOCKUP // LIGHT EMITTING MODEL ]</p>
      <div className="monolith-stage">
        <div className="hero-glass" aria-hidden="true">
          <span className="hero-figure-glow" />
          <img
            className="hero-figure-photo"
            src="/studio-hero.png"
            alt=""
            width={1440}
            height={1840}
            decoding="async"
            draggable={false}
          />
          <span className="hero-figure-tint" />
        </div>
        <span className="monolith-orbit monolith-orbit-a" aria-hidden="true" />
        <span className="monolith-orbit monolith-orbit-b" aria-hidden="true" />
        <span className="monolith-orbit monolith-orbit-c" aria-hidden="true" />
        <MonolithPlate />
      </div>
      <div className="hero-showcase-caption">
        <p>THE REFRACTED MONOLITH</p>
        <span>The idea, made physical — 45° shear, glass mass, and a live pulse.</span>
      </div>
    </aside>
  );
}
