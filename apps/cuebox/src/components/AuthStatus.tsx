"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useLibrary } from "@/lib/library-context";

export function AuthStatus() {
  const { data: session, status } = useSession();
  const { mode } = useLibrary();

  if (status === "loading") {
    return <span className="auth-status muted">Сессия…</span>;
  }

  if (!session?.user) {
    return (
      <div className="auth-status">
        <span className="mode-pill">Локально</span>
        <Link href="/login" className="btn btn-ghost">
          Войти
        </Link>
        <Link href="/register" className="btn btn-primary">
          Регистрация
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-status">
      <span className="mode-pill cloud">{mode === "cloud" ? "Облако" : "Локально"}</span>
      <span className="user-email">{session.user.email}</span>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Выйти
      </button>
    </div>
  );
}
