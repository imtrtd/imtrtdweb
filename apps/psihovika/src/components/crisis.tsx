import { cn } from "@/lib/cn";

export function CrisisNote({ hot = false }: { hot?: boolean }) {
  return (
    <aside className={cn("border p-4", hot ? "border-ox bg-sheet" : "border-line bg-paper")}>
      <h2 className="font-serif text-2xl text-balance">{hot ? "Если сейчас совсем плохо" : "Если станет невыносимо"}</h2>
      <p className="mt-2 text-pretty">
        Экстренно, если есть угроза жизни: <strong>112</strong>. Психологическая поддержка круглосуточно:{" "}
        <strong>0 800 33 20 29</strong> и <strong>0 800 210 160</strong>. Детям и подросткам: <strong>116 111</strong>.
      </p>
      <p className="mt-2 text-sm text-muted text-pretty">
        Короткий номер 7333 мог работать с перебоями. Если трубку не берут, не ждите его: звоните на номера выше.
      </p>
    </aside>
  );
}
