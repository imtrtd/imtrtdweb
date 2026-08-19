import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-brand">
          Cuebox
        </Link>
        <h1>Вход</h1>
        <p className="auth-lead">
          Облачная библиотека промптов, подсказок, задач и чатов
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
