import { createFileRoute, Link } from "@tanstack/react-router";
import { Runner } from "@/components/runner";
import { Shell } from "@/components/shell";
import { getTest, DEFAULT_SEARCH } from "@/data/catalog";
import { BRAND } from "@/lib/brand";
import { getPublicMethod } from "@/lib/cms/server";

export const Route = createFileRoute("/m/$id")({
  loader: async ({ params }) => {
    const test = await getPublicMethod({ data: { id: params.id } });
    return { test };
  },
  head: ({ params, loaderData }) => {
    const test = loaderData?.test ?? getTest(params.id);
    return {
      meta: [{ title: test ? `${test.title} — ${BRAND}` : `Методика — ${BRAND}` }],
    };
  },
  component: MethodPage,
});

function MethodPage() {
  const { test } = Route.useLoaderData();
  if (!test) {
    return (
      <Shell>
        <main className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="font-serif text-4xl">Такой методики нет</h1>
          <p className="mt-3 text-pretty">
            Возможно, ссылка устарела. В каталоге сейчас другой состав.
          </p>
          <Link
            to="/"
            search={DEFAULT_SEARCH}
            className="mt-6 inline-flex h-11 items-center text-ox"
          >
            В каталог
          </Link>
        </main>
      </Shell>
    );
  }
  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <Link
          to="/"
          search={DEFAULT_SEARCH}
          className="float-glass inline-flex h-10 items-center rounded-full px-4 text-sm text-muted transition-colors hover:text-ink"
        >
          ← Каталог
        </Link>
      </div>
      <Runner test={test} />
    </Shell>
  );
}
