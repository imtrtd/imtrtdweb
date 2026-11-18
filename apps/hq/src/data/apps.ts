/** The personal mini apps listed on /apps. Each opens as its own standalone page. */
export type App = {
  slug: string;
  href: string;
  name: string;
  mono: string;
  kind: string;
  /** One line under the name. */
  line: string;
  text: string;
  facts: string[];
  soon?: boolean;
  /** 16:10 preview of the working screen in /images/apps/<shot>-card.{webp,jpg}. None: a drawn placeholder. */
  shot?: string;
};

export const apps: App[] = [
  {
    slug: "cuebox",
    shot: "cuebox",
    href: "/apps/cuebox",
    name: "Cuebox",
    mono: "Cb",
    kind: "Prompt library",
    line: "Write it once. Paste it forever.",
    text: "Prompts sorted by the AI they work on, blanks filled in before sending, then copied or opened straight in ChatGPT, Claude or Perplexity.",
    facts: ["Variables", "Folders", "Export"],
  },
  {
    slug: "pulse",
    shot: "pulse",
    href: "/apps/pulse",
    name: "Pulse",
    mono: "Pb",
    kind: "8-bit sequencer",
    line: "Four channels. Sixteen steps. No install.",
    text: "Two pulse voices, a triangle bass and a noise kit, synthesised live. Three tunes to start from, or a blank page for the brave.",
    facts: ["Web Audio", "Songs", "Space plays"],
  },
  {
    slug: "komandir",
    shot: "komandir",
    href: "/komandir",
    name: "Komandir",
    mono: "Km",
    kind: "Command builder",
    line: "Your commands. One tap each.",
    text: "Chain steps (a link, an app, an iOS Shortcut, a call, a text, a voice, a pause) and run them from a tile, a link or the Home Screen.",
    facts: ["iOS Shortcuts", "Run links", "Templates"],
  },
  {
    slug: "shell",
    href: "/apps/shell",
    name: "I/TD shell",
    mono: "Sh",
    kind: "Coming soon",
    line: "Not yet. Soon.",
    text: "The next tool. Details when it is ready to defend them; leave a contact to hear first.",
    facts: ["Notify me"],
    soon: true,
  },
];
