import { createFileRoute, Link } from "@tanstack/react-router";
import { Runner } from "@/components/runner";
import { Shell } from "@/components/shell";
import { getTest, DEFAULT_SEARCH } from "@/data/catalog";

export const Route = createFileRoute("/m/$id")({
  head: ({ params }) => {
    const test = getTest(params.id);
    return {
      meta: [{ title: test ? `${test.title} — psy` : "Методика — psy" }],
    };
  },
  component: MethodPage,
});

function MethodPage() {
  const { id } = Route.useParams();
  const test = getTest(id);
  if (!test) {
    return (
      <Shell>
        <main className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="font-serif text-4xl">Такой методики нет</h1>
          <p className="mt-3 text-pretty">Возможно, ссылка устарела. В каталоге сейчас другой состав.</p>
          <Link to="/" search={DEFAULT_SEARCH} className="mt-6 inline-flex h-11 items-center text-ox">
            В каталог
          </Link>
        </main>
      </Shell>
    );
  }
  return (
    <Shell>
      <div className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <Link to="/" search={DEFAULT_SEARCH} className="text-sm text-muted">
            ← Каталог
          </Link>
        </div>
      </div>
      <Runner test={test} />
    </Shell>
  );
}
