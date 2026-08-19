import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-brand">
          Cuebox
        </Link>
        <h1>Регистрация</h1>
        <p className="auth-lead">
          Создайте аккаунт, чтобы синхронизировать библиотеку между устройствами
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}
