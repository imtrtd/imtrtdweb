import type { Test } from "@/data/build";
import type { Piece, Score } from "@/lib/scoring";

function numberOf(piece: Piece) {
  return `${piece.shown} из ${piece.max}`;
}

export function resultPrompt(
  test: Test,
  score: Score,
  at: number,
  extra?: { depth?: string; note?: string; watch?: Piece | null },
) {
  const when = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(at);

  const blocks: string[] = [
    "Ты внимательный собеседник. Ниже мой самоотчёт из приложения «psy». Это не диагноз, не назначение и не замена живого специалиста. Не ставь диагноз, не выдумывай баллы и не противоречь тексту интерпретации: он уже посчитан методикой.",
    [
      `Методика: ${test.title}`,
      `Школа: ${test.school}`,
      `Тема: ${test.category}`,
      `Когда пройдено: ${when}`,
      `Вид: ${test.gold ? "публичная шкала" : "учебная реконструкция, не норма по населению"}`,
      extra?.depth ? `Глубина: ${extra.depth}` : "",
      extra?.note ? `Как читать глубину: ${extra.note}` : "",
      `Источник: ${test.source}`,
    ]
      .filter(Boolean)
      .join("\n"),
  ];

  if (score.total) {
    blocks.push(
      ["Общий итог", score.total.title, `Число: ${numberOf(score.total)}`, score.total.text].join("\n"),
    );
  }

  if (extra?.watch) {
    blocks.push(
      ["Самонаблюдение вне балла шкалы", extra.watch.title, `Число: ${numberOf(extra.watch)}`, extra.watch.text].join("\n"),
    );
  }

  if (score.dims.length) {
    blocks.push(
      [
        "По шкалам",
        ...score.dims.map((dim) => {
          const name = dim.name ?? "Шкала";
          return `• ${name} — ${dim.title}. ${numberOf(dim)}. ${dim.text}`;
        }),
      ].join("\n"),
    );
  }

  if (test.warn) blocks.push(`Оговорка методики: ${test.warn}`);

  if (score.crisis) {
    blocks.push(
      "В подсчёте есть сигнал, который методика помечает как требующий внимания. Если я пишу, что сейчас есть мысли о смерти или угроза жизни, не веди терапию в чате: прямо предложи экстренную помощь (112) и круглосуточные линии 0 800 33 20 29 и 0 800 210 160. Иначе мягко отметь, что этот фрагмент лучше обсудить с живым человеком, и не драматизируй сверх текста.",
    );
  }

  blocks.push(
    [
      "Ответь по-русски, спокойно, на «вы», без канцелярита и без длинных пронумерованных простыней.",
      "1. Перескажи профиль обычным языком: что звучит сильнее, что тише, какое сочетание шкал важно, а какое легко переоценить.",
      "2. Отдели то, что методика действительно показывает, от того, чего она не показывает.",
      "3. Дай 3–5 вопросов для самонаблюдения на две недели. Не советуй «просто расслабиться» и не назначай лечение, лекарства и диагнозы.",
      "4. Если уместно, назови одну соседнюю тему, которую имеет смысл заметить, без запугивания.",
    ].join("\n"),
  );

  return blocks.join("\n\n");
}

export function resultFileName(id: string) {
  const safe = id.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "") || "itog";
  return `psy-${safe}.txt`;
}
