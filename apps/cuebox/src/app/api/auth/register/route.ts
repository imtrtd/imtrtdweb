import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureAiFolders } from "@/lib/ensure-ai-folders";

const MAX_REGISTRATION_BYTES = 16 * 1024;
const MAX_PASSWORD_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REGISTRATION_BYTES) {
    return NextResponse.json({ error: "Слишком большой запрос" }, { status: 413 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: "Укажите корректный email" },
        { status: 400 },
      );
    }
    if (password.length < 12 || password.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: "Пароль должен содержать от 12 до 128 символов" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже есть" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true },
    });

    await ensureAiFolders(user.id);

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Не удалось зарегистрироваться" },
      { status: 500 },
    );
  }
}
