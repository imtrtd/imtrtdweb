import type { FormEvent } from "react";
import { useState } from "react";
import { submitLead } from "../../lib/api";

const TASK_TYPES = [
	"Брендинг",
	"Product UI",
	"Лендинг",
	"Дизайн-система",
	"Другое",
];

export function LeadForm() {
	const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
		"idle",
	);
	const [error, setError] = useState("");

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);

		setStatus("loading");
		setError("");

		try {
			await submitLead({
				name: String(data.get("name") ?? ""),
				contact: String(data.get("contact") ?? ""),
				task_type: String(data.get("task_type") ?? ""),
				budget: String(data.get("budget") ?? ""),
				message: String(data.get("message") ?? ""),
				website: String(data.get("website") ?? ""),
			});
			setStatus("done");
			form.reset();
		} catch (err) {
			setStatus("error");
			setError(err instanceof Error ? err.message : "Ошибка отправки");
		}
	}

	if (status === "done") {
		return (
			<div className="rounded-[24px] border border-signal/30 bg-[#121821] p-8 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
				<p className="font-display text-2xl text-signal">Заявка отправлена</p>
				<p className="mt-3 max-w-md text-mist">
					Мы ответим в течение одного рабочего дня. Если срочно — напишите в
					Telegram.
				</p>
				<button
					type="button"
					className="mt-6 text-sm font-medium text-paper underline-offset-4 transition hover:text-signal hover:underline"
					onClick={() => setStatus("idle")}
				>
					Отправить ещё одну
				</button>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} className="space-y-5" noValidate>
			<div className="grid gap-5 md:grid-cols-2">
				<label className="block space-y-2">
					<span className="text-sm text-mist">Имя</span>
					<input
						required
						name="name"
						autoComplete="name"
						className="w-full rounded-xl border border-white/10 bg-[#121821] px-4 py-3 text-paper outline-none transition placeholder:text-mist/70 focus:border-signal/60 focus:ring-2 focus:ring-signal/15"
					/>
				</label>
				<label className="block space-y-2">
					<span className="text-sm text-mist">Telegram или email</span>
					<input
						required
						name="contact"
						autoComplete="email"
						className="w-full rounded-xl border border-white/10 bg-[#121821] px-4 py-3 text-paper outline-none transition placeholder:text-mist/70 focus:border-signal/60 focus:ring-2 focus:ring-signal/15"
					/>
				</label>
			</div>

			<div className="grid gap-5 md:grid-cols-2">
				<label className="block space-y-2">
					<span className="text-sm text-mist">Тип задачи</span>
					<select
						name="task_type"
						defaultValue=""
						className="w-full rounded-xl border border-white/10 bg-[#121821] px-4 py-3 text-paper outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/15"
					>
						<option value="" disabled>
							Выберите
						</option>
						{TASK_TYPES.map((type) => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
				</label>
				<label className="block space-y-2">
					<span className="text-sm text-mist">Бюджет / сроки</span>
					<input
						name="budget"
						placeholder="Опционально"
						className="w-full rounded-xl border border-white/10 bg-[#121821] px-4 py-3 text-paper outline-none transition placeholder:text-mist/70 focus:border-signal/60 focus:ring-2 focus:ring-signal/15"
					/>
				</label>
			</div>

			<label className="block space-y-2">
				<span className="text-sm text-mist">О задаче</span>
				<textarea
					name="message"
					rows={4}
					className="w-full resize-y rounded-xl border border-white/10 bg-[#121821] px-4 py-3 text-paper outline-none transition placeholder:text-mist/70 focus:border-signal/60 focus:ring-2 focus:ring-signal/15"
				/>
			</label>

			{/* honeypot */}
			<input
				type="text"
				name="website"
				tabIndex={-1}
				autoComplete="off"
				aria-hidden="true"
				className="absolute left-[-9999px] h-0 w-0 opacity-0"
			/>

			<p className="text-xs text-mist/80">
				Отправляя форму, вы соглашаетесь на обработку контакта для ответа на
				заявку.
			</p>

			{error ? <p className="text-sm text-red-300">{error}</p> : null}

			<button
				type="submit"
				disabled={status === "loading"}
				className="inline-flex items-center justify-center rounded-full bg-signal px-7 py-3 text-sm font-semibold text-ink transition hover:bg-signal-deep disabled:opacity-60"
			>
				{status === "loading" ? "Отправляем…" : "Отправить заявку"}
			</button>
		</form>
	);
}
