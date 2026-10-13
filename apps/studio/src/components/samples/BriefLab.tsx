import { useMemo, useState } from "react";

type FeatureKey =
  | "booking"
  | "catalog"
  | "journal"
  | "prices"
  | "form"
  | "map"
  | "lang"
  | "reviews"
  | "gallery"
  | "shop";

type Brief = {
  id: string;
  name: string;
  line: string;
  palette: keyof typeof palettes;
  type: "grotesk" | "serif" | "mono";
  layout: "split" | "stack" | "editorial" | "grid";
  nav: "bar" | "corner" | "hidden";
  hero: "statement" | "offer" | "portrait";
  density: "air" | "tight";
  motion: "still" | "drift" | "glitch";
  features: Record<FeatureKey, boolean>;
};

const palettes = {
  void: { bg: "#070707", fg: "#ece8e0", mute: "#8d8d8d", accent: "#d8ff00", plate: "#141414" },
  paper: { bg: "#f3efe6", fg: "#161616", mute: "#5c5c5c", accent: "#111111", plate: "#e7e1d6" },
  dusk: { bg: "#100e14", fg: "#f2eef8", mute: "#a398b0", accent: "#c9a6ff", plate: "#1b1722" },
  sea: { bg: "#071416", fg: "#e7f4f2", mute: "#8eaea8", accent: "#9ee7d8", plate: "#102022" },
  heat: { bg: "#140c0a", fg: "#f6efe8", mute: "#b59a90", accent: "#ff6a3d", plate: "#241410" },
} as const;

const features: { key: FeatureKey; label: string; spec: string }[] = [
  { key: "booking", label: "Booking", spec: "dated booking, not a contact dump" },
  { key: "catalog", label: "Catalog", spec: "a short catalog of offers" },
  { key: "journal", label: "Journal", spec: "a writing or news index" },
  { key: "prices", label: "Prices", spec: "a visible rate table" },
  { key: "form", label: "Inquiry", spec: "a short inquiry form" },
  { key: "map", label: "Place", spec: "a place line, no embedded map widget" },
  { key: "lang", label: "Languages", spec: "EN / UA switch" },
  { key: "reviews", label: "Reviews", spec: "two short quotes" },
  { key: "gallery", label: "Gallery", spec: "a strip of work plates" },
  { key: "shop", label: "Shop", spec: "one buy row, no full storefront" },
];

const emptyFeatures = Object.fromEntries(features.map((item) => [item.key, false])) as Record<
  FeatureKey,
  boolean
>;

const templates: Brief[] = [
  {
    id: "atelier",
    name: "Atelier",
    line: "A studio that books from the first screen.",
    palette: "void",
    type: "grotesk",
    layout: "split",
    nav: "bar",
    hero: "statement",
    density: "air",
    motion: "drift",
    features: { ...emptyFeatures, booking: true, gallery: true, prices: true, form: true },
  },
  {
    id: "route",
    name: "Route",
    line: "Tours, dates and a place, on paper.",
    palette: "paper",
    type: "serif",
    layout: "editorial",
    nav: "bar",
    hero: "offer",
    density: "air",
    motion: "still",
    features: { ...emptyFeatures, catalog: true, map: true, reviews: true, lang: true },
  },
  {
    id: "instrument",
    name: "Instrument",
    line: "A product with one job and a tight frame.",
    palette: "sea",
    type: "mono",
    layout: "grid",
    nav: "corner",
    hero: "portrait",
    density: "tight",
    motion: "still",
    features: { ...emptyFeatures, catalog: true, prices: true, form: true, lang: true },
  },
  {
    id: "ledger",
    name: "Ledger",
    line: "An editorial index. Reading first.",
    palette: "dusk",
    type: "serif",
    layout: "stack",
    nav: "corner",
    hero: "statement",
    density: "air",
    motion: "still",
    features: { ...emptyFeatures, journal: true, gallery: true, form: true },
  },
  {
    id: "night",
    name: "Night",
    line: "An event page that sells the next date.",
    palette: "heat",
    type: "grotesk",
    layout: "split",
    nav: "bar",
    hero: "offer",
    density: "tight",
    motion: "glitch",
    features: { ...emptyFeatures, catalog: true, shop: true, reviews: true, map: true },
  },
];

function specOf(brief: Brief) {
  const on = features.filter((item) => brief.features[item.key]);
  const lines = [
    `${brief.name}`,
    brief.line,
    "",
    `Palette: ${brief.palette}`,
    `Type: ${brief.type}`,
    `Layout: ${brief.layout}`,
    `Navigation: ${brief.nav}`,
    `Hero: ${brief.hero}`,
    `Density: ${brief.density}`,
    `Motion: ${brief.motion}`,
    "",
    on.length ? "Include:" : "Include: a single screen, no extra modules",
    ...on.map((item) => `- ${item.label}: ${item.spec}`),
    "",
    "Deliver one working sample in this system. No extra pages unless a module needs one.",
  ];
  return lines.join("\n");
}

function Frame({ brief, phone }: { brief: Brief; phone: boolean }) {
  const palette = palettes[brief.palette];
  const font =
    brief.type === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : brief.type === "mono"
        ? "ui-monospace, 'Geist Mono', monospace"
        : "Arial, 'Arimo', sans-serif";
  const pad = brief.density === "air" ? (phone ? 16 : 28) : phone ? 12 : 16;
  const on = features.filter((item) => brief.features[item.key]);
  const titleSize = phone ? 34 : brief.layout === "editorial" ? 54 : 46;

  return (
    <div
      className={`tz-frame tz-motion-${brief.motion}`}
      style={{ background: palette.bg, color: palette.fg, fontFamily: font, padding: pad }}
    >
      {brief.nav !== "hidden" ? (
        <div className="tz-nav" style={{ color: palette.mute }}>
          <span>{brief.name}</span>
          <span>{brief.nav === "corner" ? "Menu" : brief.features.lang ? "EN  UA" : "Work  Book"}</span>
        </div>
      ) : null}
      <div className={`tz-hero tz-hero-${brief.layout}`}>
        <div>
          <p className="tz-kicker" style={{ color: palette.accent }}>
            {brief.hero === "offer" ? "Next open date" : "Sample"}
          </p>
          <h3 className={brief.motion === "glitch" ? "tz-glitch" : undefined} style={{ fontSize: titleSize }}>
            {brief.name}
          </h3>
          <p style={{ color: palette.mute, maxWidth: "28ch" }}>{brief.line}</p>
        </div>
        {brief.hero !== "statement" ? (
          <div className="tz-offer" style={{ background: palette.plate, color: palette.fg }}>
            <span style={{ color: palette.accent }}>{brief.hero === "portrait" ? "Plate" : "From"}</span>
            <strong>{brief.hero === "portrait" ? "01" : "Open"}</strong>
          </div>
        ) : null}
      </div>
      {on.length ? (
        <ul className={brief.layout === "grid" ? "tz-modules tz-modules-grid" : "tz-modules"}>
          {on.map((item) => (
            <li key={item.key} style={{ borderColor: palette.mute }}>
              <span style={{ color: palette.accent }}>{item.label}</span>
              <span style={{ color: palette.mute }}>{item.spec}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: palette.mute }}>One screen. Nothing else.</p>
      )}
    </div>
  );
}

export function BriefLab() {
  const [brief, setBrief] = useState<Brief>(templates[0]);
  const [phone, setPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  const spec = useMemo(() => specOf(brief), [brief]);

  const patch = (partial: Partial<Brief>) => setBrief((current) => ({ ...current, ...partial }));
  const toggle = (key: FeatureKey) =>
    setBrief((current) => ({
      ...current,
      features: { ...current.features, [key]: !current.features[key] },
    }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(spec);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="tz">
      <div className="tz-templates">
        {templates.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === brief.id ? "tz-card is-on" : "tz-card"}
            onClick={() => setBrief(item)}
          >
            <span className="tz-card-preview">
              <Frame brief={item} phone />
            </span>
            <span className="tz-card-name">{item.name}</span>
            <span className="tz-card-line">{item.line}</span>
          </button>
        ))}
      </div>

      <div className="tz-lab" id="brief-lab">
        <div className="tz-controls">
          <p className="label text-signal">Brief visualizer</p>
          <label className="tz-field">
            <span>Name</span>
            <input value={brief.name} maxLength={28} onChange={(event) => patch({ name: event.target.value, id: "custom" })} />
          </label>
          <label className="tz-field">
            <span>Line</span>
            <input value={brief.line} maxLength={90} onChange={(event) => patch({ line: event.target.value, id: "custom" })} />
          </label>

          <p className="tz-group">Palette</p>
          <div className="tz-row">
            {(Object.keys(palettes) as (keyof typeof palettes)[]).map((key) => (
              <button
                key={key}
                type="button"
                className={brief.palette === key ? "is-on" : undefined}
                onClick={() => patch({ palette: key, id: "custom" })}
                aria-label={key}
              >
                <i style={{ background: palettes[key].accent }} />
                {key}
              </button>
            ))}
          </div>

          {(
            [
              ["Type", "type", ["grotesk", "serif", "mono"]],
              ["Layout", "layout", ["split", "stack", "editorial", "grid"]],
              ["Nav", "nav", ["bar", "corner", "hidden"]],
              ["Hero", "hero", ["statement", "offer", "portrait"]],
              ["Density", "density", ["air", "tight"]],
              ["Motion", "motion", ["still", "drift", "glitch"]],
            ] as const
          ).map(([label, key, values]) => (
            <div key={key}>
              <p className="tz-group">{label}</p>
              <div className="tz-row">
                {values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={brief[key] === value ? "is-on" : undefined}
                    onClick={() => patch({ [key]: value, id: "custom" })}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="tz-group">Modules</p>
          <div className="tz-row">
            {features.map((item) => (
              <button
                key={item.key}
                type="button"
                className={brief.features[item.key] ? "is-on" : undefined}
                onClick={() => toggle(item.key)}
                aria-pressed={brief.features[item.key]}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tz-stage">
          <div className="tz-stage-bar">
            <button type="button" className={!phone ? "is-on" : undefined} onClick={() => setPhone(false)}>
              Desk
            </button>
            <button type="button" className={phone ? "is-on" : undefined} onClick={() => setPhone(true)}>
              Phone
            </button>
            <button type="button" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy brief"}
            </button>
            <a href={`mailto:imtrtd@pm.me?subject=${encodeURIComponent(`Sample · ${brief.name}`)}&body=${encodeURIComponent(spec)}`}>
              Send
            </a>
          </div>
          <div className={phone ? "tz-device is-phone" : "tz-device"}>
            <Frame brief={brief} phone={phone} />
          </div>
          <pre className="tz-spec">{spec}</pre>
        </div>
      </div>
    </div>
  );
}
