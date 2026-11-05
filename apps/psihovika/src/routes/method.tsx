import { createFileRoute, Link } from "@tanstack/react-router";
import { CrisisNote } from "@/components/crisis";
import { Shell } from "@/components/shell";
import { TESTS, DEFAULT_SEARCH } from "@/data/catalog";

export const Route = createFileRoute("/method")({
  head: () => ({ meta: [{ title: "Метод — ПсихоВика" }] }),
  component: Method,
});

function Method() {
  const gold = TESTS.filter((t) => t.gold).length;
  const depth = TESTS.filter((t) => t.focus).length;
  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs uppercase tracking-widest text-ox">Как это собрано</p>
        <h1 className="mt-3 font-serif text-5xl text-balance">Не витрина интернет-тестов</h1>
        <p className="mt-5 text-lg text-pretty">
          В кабинете {TESTS.length} методик. {depth} из них про психоанализ, юнгианский анализ и разговорную терапию. {gold} — публичные клинические шкалы с их собственным подсчётом.
        </p>

        <h2 className="mt-10 font-serif text-3xl">Два сорта пунктов</h2>
        <p className="mt-3 text-pretty">
          Публичные шкалы воспроизведены близко к источнику: PHQ-9, GAD-7, PHQ-4, WHO-5, DASS-21, AUDIT и PCL-5. Их можно использовать клинически без лицензионного сбора. Перевод сделан для этого кабинета и не является официальной валидизацией на русской выборке.
        </p>
        <p className="mt-3 text-pretty">
          Остальное — учебные реконструкции конструктов. Идея, имена авторов и логика шкал взяты из литературы. Формулировки написаны заново. Это сознательно не DSQ, не ECR, не MBTI, не опросник Маслач, не шкала Бека, не MMPI, не Сонди и не Люшер. Популярность сайта с тестом не делает бланк ни свободным, ни точным.
        </p>

        <h2 className="mt-10 font-serif text-3xl">Как читать итог</h2>
        <p className="mt-3 text-pretty">
          У учебных методик индекс от 0 до 100 внутри своих пунктов. Нет стенов, нет «вы входите в 12% населения». Высокий балл значит: этот способ у вас звучит часто. У публичных шкал пороги те, что опубликовали авторы. Даже они скрининг, не диагноз.
        </p>
        <p className="mt-3 text-pretty">
          Профиль, например привязанность или конфликт, не выбирает вам тип. Он показывает, какие полюса сейчас громче. В другой связи рисунок сдвигается. В терапии он ещё и становится материалом, а не ярлыком.
        </p>

        <h2 className="mt-10 font-serif text-3xl">Чего кабинет не делает</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Не ставит расстройство личности, ПТСР, депрессию или зависимость.</li>
          <li>Не отправляет ответы никуда. История лежит в браузере этого устройства.</li>
          <li>Не заменяет кушетку, КПТ, врача и скорую.</li>
        </ul>

        <div className="mt-8">
          <CrisisNote />
        </div>

        <h2 className="mt-10 font-serif text-3xl">Опора, коротко</h2>
        <ul className="mt-3 space-y-2 text-sm text-pretty">
          <li>Freud, A. Freud, Klein, Winnicott, Bion, Kernberg, Kohut — защиты, объект и структура.</li>
          <li>Bowlby, Ainsworth, Bartholomew, Mikulincer — привязанность.</li>
          <li>Jung — установка, функции, тень, персона, индивидуация. Не Майерс–Бриггс.</li>
          <li>Fonagy — ментализация. Vaillant — иерархия защит.</li>
          <li>Kroenke, Spitzer — PHQ и GAD. Lovibond — DASS. WHO — AUDIT и WHO-5. Weathers — PCL-5. Goldberg — IPIP.</li>
          <li>Yalom — предельные данности. Snyder — надежда. Schwartz — ценности. Gross — регуляция эмоций. Neff, Blatt, Rosenberg — отношение к себе как конструкты, не их бланки.</li>
        </ul>
        <p className="mt-8">
          <Link to="/" search={DEFAULT_SEARCH} className="text-ox">
            Вернуться в каталог
          </Link>
        </p>
      </main>
    </Shell>
  );
}
