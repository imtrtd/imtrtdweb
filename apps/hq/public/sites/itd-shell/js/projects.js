/* ═══════════════════════════════════════════════════════════════════════════
   I/TD Neon Spiral v2 — Complete System Registry
   All apps, AI tools, browsers, repos, and external links
   ═══════════════════════════════════════════════════════════════════════════ */
window.ITD_PROJECTS = [
  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  AI & ASSISTANTS                                                     ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  { title: "CLAUDE DESKTOP",       description: "Anthropic's Claude AI assistant — reasoning, coding, analysis.",          category: "AI", stack: "AI", access: "LOCAL", status: "live",    local: "C:/Users/guest/AppData/Roaming/Claude" },
  { title: "CURSOR",               description: "AI-first code editor with Copilot, inline edits, and chat.",              category: "AI", stack: "AI", access: "LOCAL", status: "live",    local: "C:/Users/guest/AppData/Local/Programs/cursor" },
  { title: "OLLAMA",               description: "Local LLM runner — run Llama, Mistral, Phi, Gemma locally.",              category: "AI", stack: "AI", access: "LOCAL", status: "live",    local: "C:/Users/guest/AppData/Local/Ollama" },
  { title: "GITHUB COPILOT",       description: "AI pair programmer — code suggestions, chat, and inline edits.",           category: "AI", stack: "AI", access: "LOCAL", status: "live",    local: "C:/Users/guest/AppData/Local/Programs/GitHub Copilot" },
  { title: "PERPLEXITY AI",        description: "AI search engine with citations and real-time web access.",                category: "AI", stack: "AI", access: "LOCAL", status: "live",    local: "C:/Users/guest/AppData/Local/Programs/PerplexityAI", url: "https://perplexity.ai" },
  { title: "KIMI",                 description: "Moonshot AI — long-context assistant with web search.",                   category: "AI", stack: "AI", access: "LOCAL", status: "live",    local: "C:/Users/guest/AppData/Local/Programs/Kimi", url: "https://kimi.moonshot.cn" },
  { title: "HERMES",               description: "Nous Research Hermes — local AI model runner.",                           category: "AI", stack: "AI", access: "LOCAL", status: "live",    local: "C:/Users/guest/AppData/Local/hermes" },
  { title: "KEPLER",               description: "Kepler AI assistant — local inference and chat.",                         category: "AI", stack: "AI", access: "LOCAL", status: "live",    local: "C:/Users/guest/AppData/Local/kepler-updater" },
  { title: "STABILITY MATRIX",     description: "Stable Diffusion launcher — ComfyUI, A1111, Forge.",                     category: "AI", stack: "AI", access: "LOCAL", status: "live" },
  { title: "REPLIT AI",            description: "Cloud IDE with AI agent for building and deploying apps.",                category: "AI", stack: "AI", access: "LOCAL", status: "live",    url: "https://replit.com" },

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  BROWSERS                                                            ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  { title: "BRAVE",                description: "Privacy-focused Chromium browser with built-in ad blocker.",             category: "BROWSER", stack: "CHROMIUM", access: "LOCAL", status: "live", local: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe" },
  { title: "FIREFOX",              description: "Independent browser with enhanced privacy and container tabs.",           category: "BROWSER", stack: "GECKO",    access: "LOCAL", status: "live", local: "C:/Program Files/Mozilla Firefox/firefox.exe" },
  { title: "CHROME",               description: "Google's Chromium browser — extensions, sync, devtools.",                category: "BROWSER", stack: "CHROMIUM", access: "LOCAL", status: "live", local: "C:/Program Files/Google/Chrome/Application/chrome.exe" },
  { title: "EDGE",                 description: "Microsoft Edge — Chromium-based with Copilot integration.",              category: "BROWSER", stack: "CHROMIUM", access: "LOCAL", status: "live", local: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" },
  { title: "TOR BROWSER",          description: "Privacy browser routing through Tor network.",                           category: "BROWSER", stack: "GECKO",    access: "LOCAL", status: "live" },

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  DESKTOP APPS                                                        ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  { title: "AYUGRAM",              description: "Fork of Telegram Desktop with extra features and privacy.",             category: "APP", stack: "C++", access: "LOCAL", status: "live" },
  { title: "STEAM",                description: "Valve's gaming platform — library, store, community.",                  category: "APP", stack: "C++", access: "LOCAL", status: "live" },
  { title: "DISCORD",              description: "Voice, video, and text chat for communities.",                          category: "APP", stack: "ELECTRON", access: "LOCAL", status: "live" },
  { title: "NOTION",               description: "All-in-one workspace — notes, docs, databases, wikis.",                 category: "APP", stack: "ELECTRON", access: "LOCAL", status: "live", url: "https://notion.so" },
  { title: "FIGMA",                description: "Collaborative design tool — UI/UX, prototyping, dev handoff.",          category: "APP", stack: "WEB", access: "LOCAL", status: "live", url: "https://figma.com" },
  { title: "CANVA",                description: "Design platform — templates, presentations, social media.",             category: "APP", stack: "WEB", access: "LOCAL", status: "live", url: "https://canva.com" },
  { title: "WHIMSICAL",            description: "Collaborative diagrams, wireframes, and docs.",                         category: "APP", stack: "WEB", access: "LOCAL", status: "live", url: "https://whimsical.com" },
  { title: "DOCKER",               description: "Container runtime — build, ship, run applications.",                    category: "APP", stack: "GO", access: "LOCAL", status: "live", local: "C:/Program Files/Docker" },
  { title: "GITKRAKEN",            description: "Git GUI client — visual merge, conflicts, integrations.",               category: "APP", stack: "ELECTRON", access: "LOCAL", status: "live" },
  { title: "FILEZILLA",            description: "FTP/SFTP client for file transfers.",                                   category: "APP", stack: "C++", access: "LOCAL", status: "live", local: "C:/Program Files/FileZilla FTP Client" },
  { title: "MATTERMOST",           description: "Open-source Slack alternative — self-hosted messaging.",                category: "APP", stack: "GO", access: "LOCAL", status: "live", local: "C:/Program Files/Mattermost" },
  { title: "NEXTCLOUD",            description: "Self-hosted cloud storage and collaboration.",                          category: "APP", stack: "PHP", access: "LOCAL", status: "live", local: "C:/Users/guest/Nextcloud" },
  { title: "VS CODE", app: "Visual Studio Code",              description: "Microsoft's code editor — extensions, terminal, git integration.",       category: "APP", stack: "ELECTRON", access: "LOCAL", status: "live" },
  { title: "NOTEPAD++",            description: "Lightweight text editor with syntax highlighting.",                     category: "APP", stack: "C++", access: "LOCAL", status: "live", local: "C:/Program Files/Notepad++" },
  { title: "WINRAR",               description: "Archive manager — ZIP, RAR, 7Z extraction.",                            category: "APP", stack: "C", access: "LOCAL", status: "live" },
  { title: "GITHUB CLI",           description: "GitHub command-line tool — repos, PRs, actions.",                       category: "APP", stack: "GO", access: "LOCAL", status: "live", local: "C:/Program Files/GitHub CLI" },
  { title: "POWERTOYS",            description: "Microsoft utilities — FancyZones, Color Picker, Run.",                  category: "APP", stack: "C#", access: "LOCAL", status: "live" },
  { title: "WPS OFFICE",           description: "Office suite — Writer, Spreadsheets, Presentations.",                   category: "APP", stack: "C++", access: "LOCAL", status: "live" },
  { title: "PROTON VPN",           description: "Secure VPN with no-logs policy and Secure Core.",                       category: "APP", stack: "C++", access: "LOCAL", status: "live" },

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  LOCAL REPOSITORIES                                                  ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  { title: "ITD NEON SPIRAL",      description: "This app — 3D spiral project organizer with shaders.",                  category: "REPO", stack: "JAVASCRIPT", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/itd-neon-spiral" },
  { title: "IMTRTD WEB (MONOREPO)", description: "I/TD monorepo: studio + portfolio + cuebox.",                          category: "REPO", stack: "TYPESCRIPT", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/imtrtdweb-main-port" },
  { title: "CUEBOX",               description: "Cuebox product — TypeScript full-stack app.",                            category: "REPO", stack: "TYPESCRIPT", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/cuebox", url: "https://cuebox.itd" },
  { title: "NAMENLOS WEBSITE",     description: "Namenlos brand showcase — handcrafted HTML.",                           category: "REPO", stack: "HTML", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/Namenlos-website" },
  { title: "IMTRTD CLOUDFLARE",    description: "I/TD Cloudflare Workers deployment.",                                   category: "REPO", stack: "TYPESCRIPT", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/ImTryingToDesign-Cloudflare-ready" },
  { title: "IMTRTD SITE SOURCE",   description: "I/TD main site source — Vinext + Drizzle.",                             category: "REPO", stack: "TYPESCRIPT", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/ImTryingToDesign-site-source" },
  { title: "BRANDCULTURA",         description: "Brandcultura brand assets — logos, textures.",                          category: "REPO", stack: "ASSETS", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/brandcultura" },
  { title: "BRANDCULTURA REDESIGN", description: "Brandcultura redesign — HTML/CSS.",                                    category: "REPO", stack: "HTML", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/brandcultura-redesign-main" },
  { title: "SKELETON",             description: "Scaffold/template project for Namenlos-style apps.",                    category: "REPO", stack: "HTML", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/scaffold" },
  { title: "ZEITI REDESIGN",       description: "Restaurant/café website redesign.",                                     category: "REPO", stack: "HTML", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/zeiti-redesign" },
  { title: "IMTRTD PR PORTFOLIO",  description: "I/TD portfolio PR branch — pulse mix.",                                 category: "REPO", stack: "TYPESCRIPT", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/imtrtdweb-pr-portfolio-itd-pulse-mix" },
  { title: "NAMENLOS (ARCHIVE)",   description: "Full Namenlos archive — App, docs, tools, live.",                       category: "REPO", stack: "MONOREPO", access: "LOCAL", status: "offline", local: "C:/Users/guest/Projects/namenlos" },
  { title: "IMTRTD (ARCHIVE)",     description: "ImTryingToDesign archive — documents, organisms.",                      category: "REPO", stack: "MIXED", access: "LOCAL", status: "offline", local: "C:/Users/guest/Projects/IMTRTD" },
  { title: "APP BUILDER STARTER",  description: "App Builder starter template.",                                         category: "REPO", stack: "TYPESCRIPT", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/app-builder-starter" },
  { title: "APPWRITE STARTER",     description: "Appwrite backend starter template.",                                     category: "REPO", stack: "TYPESCRIPT", access: "LOCAL", status: "live", local: "C:/Users/guest/Projects/appwrite-starter" },

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  EXTERNAL SITES                                                      ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  { title: "GITHUB",               description: "Code hosting — repos, CI/CD, Copilot, Actions.",                       category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://github.com" },
  { title: "Vercel",                description: "Frontend cloud — deploy Next.js, Svelte, Vite apps.",                  category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://vercel.com" },
  { title: "CLOUDFLARE",           description: "CDN, DNS, Workers, R2 storage, D1 database.",                           category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://cloudflare.com" },
  { title: "NETLIFY",              description: "Web hosting — deploy from Git, serverless functions.",                  category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://netlify.com" },
  { title: "ANTHROPIC",            description: "Claude AI — API, docs, research.",                                      category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://anthropic.com" },
  { title: "OPENAI",               description: "GPT models — API, playground, docs.",                                   category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://openai.com" },
  { title: "HUGGING FACE",         description: "ML model hub — datasets, spaces, inference API.",                       category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://huggingface.co" },
  { title: "NPM",                  description: "Node.js package registry.",                                            category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://npmjs.com" },
  { title: "FIGMA COMMUNITY",      description: "Design files, plugins, and templates.",                                 category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://figma.com/community" },
  { title: "DRIBBBLE",             description: "Design inspiration — shots, stories, designers.",                       category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://dribbble.com" },
  { title: "BEHANCE",              description: "Adobe's creative portfolio platform.",                                  category: "WEB", stack: "WEB", access: "PUBLIC", status: "live", url: "https://behance.net" },

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  I/TD PROJECTS                                                       ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  { title: "HOME / WEB OS",         description: "Desktop shell I/TD — spiral of projects in vanilla JavaScript.",        category: "PLATFORM", stack: "JAVASCRIPT", access: "PRIVATE", status: "live" },
  { title: "BRANDCULTURA LANDING",  description: "Brand landing page for Brandcultura on static HTML.",                   category: "BRAND",    stack: "HTML",       access: "PUBLIC",  status: "live", url: "https://brandcultura.com" },
  { title: "NAMENLOS WEBSITE",      description: "Namenlos brand showcase, handcrafted without frameworks.",              category: "BRAND",    stack: "HTML",       access: "PRIVATE", status: "live" },
  { title: "IMTRTD WEB",            description: "Main web project for I/TD on TypeScript, public repo.",                 category: "BRAND",    stack: "TYPESCRIPT", access: "PUBLIC",  status: "live", url: "https://imtrtd.com" },
  { title: "CUEBOX",                description: "Cuebox product — first public release on TypeScript.",                  category: "PRODUCT",  stack: "TYPESCRIPT", access: "PUBLIC",  status: "live" },
  { title: "TATTOO DESIGN EDITOR",  description: "Tattoo sketch editor: canvas, layers, export.",                         category: "PRODUCT",  stack: "TYPESCRIPT", access: "PRIVATE", status: "live" },
  { title: "EVE SLACK AGENT",       description: "EVE agent for Slack: commands, responses, integrations. On hold.",      category: "AI",       stack: "TYPESCRIPT", access: "PUBLIC",  status: "paused" },
  { title: "EVE CHAT",              description: "Chat interface to the EVE agent, closed development.",                   category: "AI",       stack: "TYPESCRIPT", access: "PRIVATE", status: "paused" },
  { title: "BRANDCULTURA REDESIGN", description: "Brandcultura redesign — new grid and typography. Paused.",              category: "BRAND",    stack: "HTML",       access: "PUBLIC",  status: "paused" },
  { title: "BRANDCULTURA CORE",     description: "Build scripts and infrastructure for Brandcultura.",                    category: "BRAND",    stack: "SHELL",      access: "PRIVATE", status: "offline" },
  { title: "NAMENLOS APP",          description: "Monorepo for the Namenlos application: client, server, shared.",       category: "PRODUCT",  stack: "MONOREPO",   access: "PRIVATE", status: "offline" },
  { title: "CUEBOX V2",             description: "Second version of Cuebox: rewritten core, closed dev.",                category: "PRODUCT",  stack: "TYPESCRIPT", access: "PRIVATE", status: "offline" },
  { title: "IMTRTD WWW",            description: "I/TD showcase — CSS experiments and animation.",                        category: "BRAND",    stack: "CSS",        access: "PRIVATE", status: "offline" },
  { title: "PREMIUM MERCHANDISE",   description: "Experiment: luxury merchandise configurator.",                          category: "EXPERIMENT", stack: "TYPESCRIPT", access: "PRIVATE", status: "offline" },
  { title: "HAPPY BIRTHDAY",        description: "Greeting interactive — small animation experiment.",                     category: "EXPERIMENT", stack: "TYPESCRIPT", access: "PRIVATE", status: "offline" },
  { title: "NEXT.JS NAMENLOS",      description: "Namenlos migration to Next.js: routing and server rendering.",         category: "SYSTEM",   stack: "TYPESCRIPT", access: "PRIVATE", status: "offline" },
  { title: "INTRO",                 description: "I/TD intro splash screen concept.",                                     category: "EXPERIMENT", stack: "CONCEPT",    access: "PUBLIC",  status: "live" },

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  PC SYSTEM APPS                                                      ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  { title: "TERMINAL", app: "Терминал",            description: "System terminal emulator with shell access.",                            category: "SYSTEM", stack: "RUST",  access: "SYSTEM", status: "live" },
  { title: "FILE MANAGER",        description: "Browse and manage files across drives.",                                 category: "SYSTEM", stack: "C++",   access: "SYSTEM", status: "live" },
  { title: "CALCULATOR", app: "Калькулятор",          description: "Scientific calculator with graphing.",                                   category: "SYSTEM", stack: "C",     access: "SYSTEM", status: "live" },
  { title: "SETTINGS",            description: "System configuration: display, network, accounts.",                      category: "SYSTEM", stack: "RUST",  access: "SYSTEM", status: "live" },
  { title: "CLOCK", app: "Часы",               description: "World clock, alarms, stopwatch, timer.",                                 category: "SYSTEM", stack: "C",     access: "SYSTEM", status: "live" },
  { title: "TEXT EDITOR", app: "Блокнот",         description: "Lightweight code editor with syntax highlighting.",                      category: "SYSTEM", stack: "RUST",  access: "SYSTEM", status: "live" },
  { title: "IMAGE VIEWER", app: "Photos (Preview)",        description: "View, rotate, crop, and apply filters to images.",                       category: "SYSTEM", stack: "C++",   access: "SYSTEM", status: "live" },
];
