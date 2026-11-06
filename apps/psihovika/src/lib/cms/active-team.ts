const KEY = "psihovika-active-team";

export type ActiveTeam = {
  id: string;
  name: string;
  invite_code: string;
  role: "owner" | "editor" | "viewer";
};

export function readActiveTeam(): ActiveTeam | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveTeam;
  } catch {
    return null;
  }
}

export function writeActiveTeam(team: ActiveTeam | null) {
  if (typeof window === "undefined") return;
  if (!team) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, JSON.stringify(team));
  window.dispatchEvent(new Event("psihovika-team"));
}

export function subscribeActiveTeam(cb: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("psihovika-team", cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("psihovika-team", cb);
  };
}
