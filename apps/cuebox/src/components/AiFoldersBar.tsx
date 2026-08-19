"use client";

import { AiServiceIcon } from "@/components/AiServiceIcon";
import { AI_FOLDER_SEEDS } from "@/lib/ai-folders";
import { useLibrary } from "@/lib/library-context";

function folderSlug(name: string, slug?: string | null): string {
  if (slug) return slug;
  const match = AI_FOLDER_SEEDS.find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  return match?.slug ?? "other";
}

export function AiFoldersBar() {
  const { collections, collectionFilter, setCollectionFilter } =
    useLibrary();

  const cloudAiFolders = collections.filter(
    (c) => c.slug && c.externalUrl && !c.parentId,
  );

  const folders =
    cloudAiFolders.length
      ? cloudAiFolders.map((c) => ({
          id: c.id,
          name: c.name,
          slug: folderSlug(c.name, c.slug),
          externalUrl: c.externalUrl!,
          selectable: true as const,
        }))
      : AI_FOLDER_SEEDS.map((s) => ({
          id: s.slug,
          name: s.name,
          slug: s.slug,
          externalUrl: s.externalUrl,
          selectable: false as const,
        }));

  return (
    <section className="ai-folders" aria-label="Популярные ИИ">
      <p className="ai-folders-label">ИИ сервисы</p>
      <ul className="ai-folders-list">
        {folders.map((folder) => {
          const active =
            folder.selectable && collectionFilter === folder.id;
          return (
            <li key={folder.id}>
              <div className={active ? "ai-folder active" : "ai-folder"}>
                {folder.selectable ? (
                  <button
                    type="button"
                    className="ai-folder-name"
                    onClick={() =>
                      setCollectionFilter(active ? "all" : folder.id)
                    }
                    title={`Папка ${folder.name}`}
                  >
                    <AiServiceIcon slug={folder.slug} />
                    <span>{folder.name}</span>
                  </button>
                ) : (
                  <span className="ai-folder-name">
                    <AiServiceIcon slug={folder.slug} />
                    <span>{folder.name}</span>
                  </span>
                )}
                <a
                  className="ai-folder-link"
                  href={folder.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Открыть ${folder.name}`}
                >
                  ↗
                  <span className="sr-only">Открыть {folder.name}</span>
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
