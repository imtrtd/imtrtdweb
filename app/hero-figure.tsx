export function HeroFigure() {
  return (
    <div className="hero-figure" data-motion aria-hidden="true">
      <span className="hero-figure-index">I/TD — 001</span>
      <div className="hero-figure-stage">
        <div className="hero-figure-glow" />
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
        <svg className="hero-figure-svg" viewBox="0 0 720 920">
          <ellipse className="hero-figure-ring" cx="360" cy="400" rx="280" ry="96" />
          <ellipse className="hero-figure-ring hero-figure-ring-alt" cx="360" cy="400" rx="210" ry="70" />
          <circle className="hero-figure-signal" cx="228" cy="268" r="8" />
          <circle className="hero-figure-speck" cx="548" cy="512" r="4.5" />
        </svg>
      </div>
      <span className="hero-figure-caption">FORM / SYSTEM / ENERGY</span>
    </div>
  );
}
