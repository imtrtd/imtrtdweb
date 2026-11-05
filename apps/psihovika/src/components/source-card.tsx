import { FIDELITY_LABEL, type MethodMeta } from "@/data/refs";

export function SourceCard({ meta, source }: { meta: MethodMeta; source: string }) {
  return (
    <section className="rise-in border border-line bg-sheet p-5">
      <p className="text-xs uppercase tracking-widest text-ox">{FIDELITY_LABEL[meta.fidelity]}</p>
      {meta.instrument ? (
        <h2 className="mt-2 font-serif text-2xl text-balance">{meta.instrument}</h2>
      ) : (
        <h2 className="mt-2 font-serif text-2xl">Откуда методика</h2>
      )}
      <p className="mt-3 text-pretty text-sm text-muted">{meta.primaryNote ?? source}</p>
      {meta.citations.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {meta.citations.map((cite, i) => (
            <li key={`${cite.title}-${i}`} className="border-t border-line pt-3 text-sm">
              <p className="text-pretty">
                <span className="text-ink">{cite.authors}</span>
                {" "}
                ({cite.year}). {cite.title}
                {cite.venue ? `. ${cite.venue}` : ""}.
              </p>
              {cite.note ? <p className="mt-1 text-muted text-pretty">{cite.note}</p> : null}
              {cite.url ? (
                <a
                  href={cite.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex h-10 items-center text-ox underline-offset-4 hover:underline"
                >
                  Первоисточник
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : meta.primaryNote && meta.primaryNote !== source ? (
        <p className="mt-3 text-pretty">{source}</p>
      ) : null}
    </section>
  );
}
