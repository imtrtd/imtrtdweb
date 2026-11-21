import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_SEARCH } from "@/data/catalog";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BRAND } from "@/lib/brand";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

const LINKS = [
  { to: "/", label: "Каталог" },
  { to: "/method", label: "Метод" },
  { to: "/history", label: "Кабинет" },
  { to: "/editor", label: "Редактор" },
  { to: "/team", label: "Команда" },
  { to: "/admin", label: "Админка" },
] as const;

const BURST = Array.from({ length: 28 }, (_, i) => {
  const angle = -Math.PI / 2 + ((i - 13.5) / 14) * 1.35;
  const reach = 110 + (i % 5) * 42;
  return {
    dx: Math.round(Math.cos(angle) * reach),
    dy: Math.round(Math.sin(angle) * reach),
    delay: (i % 7) * 40,
    size: 14 + (i % 4) * 8,
  };
});

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [burst, setBurst] = useState(0);
  const { theme, toggle } = useTheme();
  const headerRef = useRef<HTMLElement>(null);

  /* Liquid Glass: refraction only where the engine can run an SVG filter as a backdrop (Chromium);
     everywhere else the panes stay frosted. The sheen follows the pointer over any pane. */
  useEffect(() => {
    const root = document.documentElement;
    const ua = navigator.userAgent;
    if (
      /Chrome\//.test(ua) &&
      !/CriOS|FxiOS|Firefox/.test(ua) &&
      !window.matchMedia("(prefers-reduced-transparency: reduce)").matches
    ) {
      root.classList.add("lg-refract");
    }
    let raf = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      raf = 0;
      const pane = (last?.target as HTMLElement | null)?.closest<HTMLElement>(".float-glass");
      if (!pane || !last) return;
      const r = pane.getBoundingClientRect();
      pane.style.setProperty("--x", `${last.clientX - r.left}px`);
      pane.style.setProperty("--y", `${last.clientY - r.top}px`);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (raf) cancelAnimationFrame(raf);
      root.classList.remove("lg-refract");
    };
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => {
      document.documentElement.style.setProperty("--shell-header-h", `${el.offsetHeight + 8}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--shell-header-h");
    };
  }, []);

  return (
    <div className="min-h-dvh bg-transparent text-ink">
      <div className="orbs" aria-hidden>
        <span
          className="orb -left-24 -top-24 size-[26rem] bg-ox/40 sm:size-[34rem]"
          style={{ ["--dur" as string]: "31s" }}
        />
        <span
          className="orb -right-32 top-[30%] size-[24rem] bg-glow/35 sm:size-[32rem]"
          style={{ ["--dur" as string]: "37s" }}
        />
        <span
          className="orb -bottom-40 left-[22%] size-[22rem] bg-ox/20 sm:size-[28rem]"
          style={{ ["--dur" as string]: "43s" }}
        />
      </div>
      <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
        <filter
          id="lg-refract"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011 0.018"
            numOctaves="2"
            seed="11"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2.5" result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="22"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <header ref={headerRef} className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
        <div className="float-glass float-glass-strong mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[1.6rem] px-3 py-1.5 sm:rounded-full sm:px-5">
          <div className="flex shrink-0 items-center gap-1">
            <Link to="/" search={DEFAULT_SEARCH} className="group flex items-baseline gap-2">
              <span className="font-serif text-lg tracking-wide sm:text-xl">{BRAND}</span>
              <span className="hidden text-xs uppercase tracking-widest text-muted sm:inline">
                кабинет
              </span>
            </Link>
            <button
              type="button"
              aria-label="Сердечко"
              onClick={() => setBurst((n) => n + 1)}
              className="flex size-11 items-center justify-center text-ox transition-transform duration-300 hover:scale-110"
            >
              <Heart className="size-4 fill-ox" />
            </button>
          </div>
          <nav className="-mx-1 flex w-full items-center gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:max-w-full lg:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {LINKS.map((link) => {
              const active = link.to === "/" ? path === "/" : path.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center px-0.5 text-sm transition-colors duration-200 sm:px-0.5",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "rounded-full px-3 py-1.5 transition-colors",
                      active ? "bg-ink/10 text-ink" : "",
                    )}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              onClick={toggle}
              className="inline-flex size-11 items-center justify-center text-muted transition-colors hover:text-ink"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <AccountSlot path={path} />
          </nav>
        </div>
      </header>
      {burst > 0 ? <Salute key={burst} onDone={() => setBurst(0)} /> : null}
      <div className="fade-in relative z-[1]">{children}</div>
      <footer className="relative z-0 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-4">
        <div className="float-glass mx-auto max-w-6xl rounded-[1.6rem] px-5 py-6 text-sm text-muted sm:px-8">
          <p className="max-w-2xl text-pretty">
            {BRAND} не ставит диагноз и не заменяет врача или психотерапевта. Ответы остаются в этом
            браузере. У публичных шкал — отсылки к первоисточникам; учебные профили помечены
            отдельно.
          </p>
        </div>
      </footer>
    </div>
  );
}

function AccountSlot({ path }: { path: string }) {
  const { isPending } = useCurrentUserState();
  if (isPending) return <span className="inline-flex h-11 w-16" aria-hidden />;
  if (path === "/login") return null;
  return (
    <>
      <SignedOut>
        <Link to="/login" className="inline-flex h-11 items-center px-2 text-sm text-ink">
          Войти
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          to="/history"
          className="inline-flex h-11 items-center px-2 text-sm text-muted hover:text-ink"
        >
          Профиль
        </Link>
      </SignedIn>
    </>
  );
}

function Salute({ onDone }: { onDone: () => void }) {
  const [still, setStill] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setStill(true);
    const id = window.setTimeout(() => done.current(), reduce ? 1600 : 2300);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-live="polite">
      <p
        className={cn(
          "love-line absolute inset-x-0 top-[38%] text-center font-serif text-4xl text-ox sm:text-6xl",
          still && "opacity-100",
        )}
      >
        Люблю тебя
      </p>
      {BURST.map((heart, i) => (
        <Heart
          key={i}
          aria-hidden
          className={cn(
            "heart-salute absolute left-1/2 top-[46%] fill-ox text-ox",
            still && "opacity-100",
          )}
          style={{
            width: heart.size,
            height: heart.size,
            animationDelay: `${heart.delay}ms`,
            ["--dx" as string]: `${heart.dx}px`,
            ["--dy" as string]: `${heart.dy}px`,
            ...(still
              ? {
                  transform: `translate(${heart.dx * 0.35}px, ${heart.dy * 0.35}px)`,
                  opacity: 0.85,
                }
              : null),
          }}
        />
      ))}
    </div>
  );
}
