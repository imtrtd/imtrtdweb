import type { CSSProperties } from "react";
import { notFound } from "next/navigation";

const studies = {
  namenlos: {
    index: "01",
    name: "NAMENLOS",
    type: "TATTOO STUDIO / BOOKING",
    accent: "#d8ff26",
    summary: "A concept case study for a tattoo studio whose visual language needed to remain raw while the booking journey became calm and clear.",
    system: "A high-contrast navigation system, an artist-first gallery, and a friction-light request flow.",
    interaction: "Dense type is paced by still moments, tactile hover states, and deliberate route choices.",
    outcome: "A directional placeholder demonstrating how identity can lead conversion without becoming a template.",
  },
  nachtwerk: {
    index: "02",
    name: "NACHTWERK",
    type: "EVENT SERIES / TICKETS",
    accent: "#8a5cff",
    summary: "A concept case study for a nocturnal event series, designed to turn changing line-ups into a confident, time-sensitive story.",
    system: "A modular schedule, a live-status layer, and tickets treated as the visual call to action.",
    interaction: "Editorial motion language makes each announcement feel immediate without making information harder to read.",
    outcome: "A placeholder for an event platform where atmosphere and practical conversion share the same stage.",
  },
  "kiosk-23": {
    index: "03",
    name: "KIOSK 23",
    type: "CAFE / LOCAL COMMERCE",
    accent: "#ff4d19",
    summary: "A concept case study for a neighbourhood cafe: small footprint, strong point of view, and a website made for a daily rhythm.",
    system: "A warm utility system for menu changes, opening hours, and local moments worth returning for.",
    interaction: "The interface balances loud brand character with a quick path to the essential details.",
    outcome: "A placeholder showing how a physical space can feel specific and alive online.",
  },
} as const;

type StudySlug = keyof typeof studies;
type CaseAccentStyle = CSSProperties & { "--case-accent": string };

export function generateStaticParams() {
  return Object.keys(studies).map((slug) => ({ slug }));
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = studies[slug as StudySlug];
  if (!study) notFound();

  const caseStyle: CaseAccentStyle = { "--case-accent": study.accent };

  return (
    <main className="case-page" style={caseStyle}>
      <nav className="case-nav">
        <a className="case-back" href="/#work">BACK TO WORK</a>
        <span className="mono">CONCEPT CASE STUDY / {study.index}</span>
      </nav>
      <section className="case-hero">
        <div>
          <p className="case-label mono">{study.type}</p>
          <h1>{study.name}</h1>
        </div>
        <div>
          <p className="case-intro">{study.summary}</p>
          <p className="case-note mono">PLACEHOLDER / NOT A CLIENT CLAIM / REFERENCE DIRECTION</p>
        </div>
      </section>
      <section className="case-grid">
        {[
          ["SYSTEM", study.system],
          ["INTERACTION", study.interaction],
          ["INTENT", study.outcome],
        ].map(([label, copy]) => (
          <article className="case-detail" key={label}>
            <b>{label}</b>
            <div>
              <h2>{label === "SYSTEM" ? "FORM MEETS FUNCTION." : label === "INTERACTION" ? "MOTION WITH A JOB." : "A CLEAR POINT OF VIEW."}</h2>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="case-prototype">
        <p className="mono">VISUAL DIRECTION / {study.index}</p>
        <h2>A USEFUL IDEA, GIVEN A PULSE.</h2>
      </section>
    </main>
  );
}
