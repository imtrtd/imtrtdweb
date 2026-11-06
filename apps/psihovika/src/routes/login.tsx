import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { authClient, signIn } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: `Вход — ${BRAND}` }] }),
  component: LoginPage,
});

type Mode = "in" | "up";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function explain(message: string) {
  const text = message.toLowerCase();
  if (text.includes("exist") || text.includes("already")) return "Эта почта уже есть. Войдите с тем же паролем.";
  if (text.includes("invalid") || text.includes("credential") || text.includes("password")) {
    return "Почта или пароль не подошли.";
  }
  if (text.includes("short") || text.includes("length")) return "Пароль слишком короткий. Нужно хотя бы 8 символов.";
  return "Не получилось. Проверьте почту и пароль и попробуйте ещё раз.";
}

function LoginPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function google() {
    setError(null);
    setBusy(true);
    try {
      await signIn("grok-google", { callbackURL: "/history" });
      await navigate({ to: "/history" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(
        message.toLowerCase().includes("pop")
          ? "Окно Google не открылось. Разрешите всплывающие окна и нажмите ещё раз."
          : "Вход через Google не завершился. Попробуйте ещё раз или войдите по почте.",
      );
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const mail = email.trim().toLowerCase();
    if (!isEmail(mail)) {
      setError("Нужен обычный адрес почты, например name@example.com.");
      return;
    }
    if (password.length < 8) {
      setError("Пароль слишком короткий. Нужно хотя бы 8 символов.");
      return;
    }
    if (mode === "up") {
      if (name.trim().length < 2) {
        setError("Напишите, как к вам обращаться.");
        return;
      }
      if (password !== confirm) {
        setError("Пароли не совпадают.");
        return;
      }
    }
    setBusy(true);
    const result =
      mode === "up"
        ? await authClient.signUp.email({ email: mail, password, name: name.trim(), callbackURL: "/history" })
        : await authClient.signIn.email({ email: mail, password, callbackURL: "/history" });
    if (result.error) {
      setError(explain(result.error.message ?? ""));
      setBusy(false);
      return;
    }
    await navigate({ to: "/history" });
  }

  return (
    <Shell>
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-ox">Аккаунт</p>
        <h1 className="mt-3 font-serif text-5xl text-balance rise-in">{mode === "up" ? "Регистрация" : "Вход"}</h1>
        <p className="mt-4 text-pretty text-muted">
          Через Google или почту с паролем. Методики можно проходить и без входа: ответы остаются в этом браузере.
          Команда и админка — после входа.
        </p>

        {isPending ? <div className="mt-8 h-11 w-40 animate-pulse bg-line" /> : null}

        {!isPending && user ? (
          <div className="mt-8 border border-line bg-sheet p-5 rise-in">
            <p>Вы уже вошли{user.primaryEmail ? `: ${user.primaryEmail}` : ""}.</p>
            <div className="mt-4">
              <UserButton />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/history">В кабинет</Link>
              </Button>
              <Button variant="line" asChild>
                <Link to="/team">К команде</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {!isPending && !user ? (
          <div className="rise-in">
            <Button className="mt-8 w-full" size="lg" disabled={busy} onClick={() => void google()}>
              Войти через Google
            </Button>

            <p className="mt-8 text-center text-xs uppercase tracking-widest text-muted">или почта</p>

            <div className="mt-4 grid grid-cols-2 border border-line">
              <button
                type="button"
                className={cn("h-11 transition-colors", mode === "in" ? "bg-ink text-paper" : "bg-sheet text-ink")}
                onClick={() => {
                  setMode("in");
                  setError(null);
                }}
              >
                Войти
              </button>
              <button
                type="button"
                className={cn("h-11 transition-colors", mode === "up" ? "bg-ink text-paper" : "bg-sheet text-ink")}
                onClick={() => {
                  setMode("up");
                  setError(null);
                }}
              >
                Регистрация
              </button>
            </div>

            <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
              {mode === "up" ? (
                <label className="block">
                  <span className="text-sm text-muted">Как к вам обращаться</span>
                  <input
                    id="signup-name"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    className="mt-1 h-12 w-full border border-line bg-sheet px-4 text-base text-ink focus:border-ox focus:outline-none"
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="text-sm text-muted">Почта</span>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 h-12 w-full border border-line bg-sheet px-4 text-base text-ink placeholder:text-muted focus:border-ox focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">Пароль</span>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 h-12 w-full border border-line bg-sheet px-4 text-base text-ink focus:border-ox focus:outline-none"
                />
              </label>
              {mode === "up" ? (
                <label className="block">
                  <span className="text-sm text-muted">Ещё раз пароль</span>
                  <input
                    id="signup-confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className="mt-1 h-12 w-full border border-line bg-sheet px-4 text-base text-ink focus:border-ox focus:outline-none"
                  />
                </label>
              ) : null}
              {error ? <p className="text-sm text-ox text-pretty">{error}</p> : null}
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Секунду…" : mode === "up" ? "Создать аккаунт" : "Войти"}
              </Button>
            </form>
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
