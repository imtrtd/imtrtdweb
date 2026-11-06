import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { CatalogView } from "@/components/catalog-view";
import { Shell } from "@/components/shell";
import { DEFAULT_SEARCH, TESTS, type HomeSearch } from "@/data/catalog";
import { listPublicCatalog } from "@/lib/cms/server";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    q: typeof search.q === "string" ? search.q : DEFAULT_SEARCH.q,
    cat: typeof search.cat === "string" ? search.cat : DEFAULT_SEARCH.cat,
    school: typeof search.school === "string" ? search.school : DEFAULT_SEARCH.school,
    dur: typeof search.dur === "string" ? search.dur : DEFAULT_SEARCH.dur,
    sort: typeof search.sort === "string" ? search.sort : DEFAULT_SEARCH.sort,
    only: typeof search.only === "string" ? search.only : DEFAULT_SEARCH.only,
  }),
  search: {
    middlewares: [stripSearchParams(DEFAULT_SEARCH)],
  },
  loader: async () => {
    try {
      const tests = await listPublicCatalog();
      return { tests };
    } catch {
      return { tests: TESTS };
    }
  },
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const { tests } = Route.useLoaderData();
  return (
    <Shell>
      <CatalogView search={search} tests={tests} />
    </Shell>
  );
}
