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
  lang: string;
  soon?: boolean;
};

export const apps: App[] = [
  {
    slug: "cuebox",
    href: "/apps/cuebox",
    name: "Cuebox",
    mono: "Cb",
    kind: "Prompt library",
    line: "Save a prompt once, reuse it everywhere.",
    text: "Prompts in folders per AI service, variables you fill in before sending, then copy or open straight in ChatGPT, Claude or Perplexity.",
    facts: ["Variables", "Folders", "Import / export"],
    lang: "RU",
  },
  {
    slug: "pulse",
    href: "/apps/pulse",
    name: "Pulse",
    mono: "Pb",
    kind: "8-bit sequencer",
    line: "Four channels, sixteen steps, four bars.",
    text: "Two pulse voices, a triangle bass and a noise drum kit, synthesised live. Loop a bar or play the song; three tunes to start from.",
    facts: ["Web Audio", "Songs", "Space plays"],
    lang: "RU",
  },
  {
    slug: "komandir",
    href: "/komandir",
    name: "Командир",
    mono: "Km",
    kind: "Command builder",
    line: "Your own commands, one tap each.",
    text: "Chain steps: open a link or an app, run an iOS Shortcut, call, message, speak, wait. Run them from a tile, a link or the home screen.",
    facts: ["iOS Shortcuts", "Run links", "Templates"],
    lang: "RU",
  },
  {
    slug: "shell",
    href: "/apps/shell",
    name: "I/TD shell",
    mono: "Sh",
    kind: "Announcement",
    line: "Coming soon.",
    text: "The next tool from the studio. Leave a contact and you will hear first when it opens.",
    facts: ["Notify me"],
    lang: "",
    soon: true,
  },
];
