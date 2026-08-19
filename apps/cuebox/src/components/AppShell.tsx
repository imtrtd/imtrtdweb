"use client";

import {
  Suspense,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthStatus } from "@/components/AuthStatus";
import { FolderSidebar } from "@/components/FolderSidebar";
import { HomeDashboard } from "@/components/HomeDashboard";
import { ItemDetail } from "@/components/ItemDetail";
import { ItemEditor } from "@/components/ItemEditor";
import { ItemList } from "@/components/ItemList";
import { SiteNav, type AppView } from "@/components/SiteNav";
import { Toolbar } from "@/components/Toolbar";
import { useLibrary } from "@/lib/library-context";
import { itemPlainText } from "@/lib/storage";
import type { ItemDraft, ItemKind, LibraryItem } from "@/lib/types";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function AppShellInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    items,
    ready,
    mode,
    localItemCount,
    collectionFilter,
    addItem,
    editItem,
    removeItem,
    duplicateItem,
    importJson,
    resetToSeed,
    importLocalToCloud,
    recordCopy,
    toggleFavorite,
  } = useLibrary();

  const view: AppView =
    searchParams.get("view") === "library" ||
    searchParams.get("create") === "1"
      ? "library"
      : "home";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [defaultKind, setDefaultKind] = useState<ItemKind>("prompt");
  const [importPromptShown, setImportPromptShown] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const askedImportRef = useRef(false);

  const createFromUrl = searchParams.get("create") === "1";
  const editorVisible = editorOpen || createFromUrl;

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const defaultCollectionId =
    collectionFilter !== "all" && collectionFilter !== "none"
      ? collectionFilter
      : "";

  useEffect(() => {
    if (
      mode !== "cloud" ||
      !ready ||
      askedImportRef.current ||
      localItemCount === 0
    ) {
      return;
    }
    askedImportRef.current = true;
    setImportPromptShown(true);
  }, [mode, ready, localItemCount]);

  function setView(next: AppView) {
    router.push(next === "home" ? "/" : "/?view=library");
  }

  function openCreate(kind: ItemKind = "prompt") {
    setEditing(null);
    setDefaultKind(kind);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    if (createFromUrl) {
      router.replace("/?view=library");
    }
  }

  function openEdit() {
    if (!selected) return;
    setEditing(selected);
    setDefaultKind(selected.kind);
    setEditorOpen(true);
  }

  function openItem(item: LibraryItem) {
    setSelectedId(item.id);
    setView("library");
  }

  async function handleSave(draft: ItemDraft, id?: string) {
    try {
      if (id) {
        await editItem(id, draft);
        setSelectedId(id);
      } else {
        const created = await addItem(draft);
        setSelectedId(created.id);
      }
      setView("library");
      closeEditor();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Удалить «${selected.title}»?`)) return;
    const id = selected.id;
    try {
      await removeItem(id);
      setSelectedId(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Ошибка удаления");
    }
  }

  async function handleDuplicate() {
    if (!selected) return;
    try {
      const copy = await duplicateItem(selected.id);
      if (copy) setSelectedId(copy.id);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Не удалось дублировать",
      );
    }
  }

  async function handleCopySelected() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(itemPlainText(selected));
      await recordCopy(selected.id);
    } catch {
      window.alert("Не удалось скопировать");
    }
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          await importJson(String(reader.result ?? ""));
          setSelectedId(null);
          setView("library");
        } catch (err) {
          window.alert(
            err instanceof Error
              ? err.message
              : "Не удалось импортировать JSON",
          );
        }
      })();
    };
    reader.readAsText(file);
  }

  async function handleImportLocal() {
    try {
      const count = await importLocalToCloud();
      setImportPromptShown(false);
      window.alert(
        count > 0
          ? `Импортировано записей: ${count}`
          : "Локальных записей не найдено",
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Импорт не удался");
    }
  }

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const meta = e.metaKey || e.ctrlKey;

    if (meta && e.key.toLowerCase() === "k") {
      e.preventDefault();
      document.getElementById("library-search")?.focus();
      if (view !== "library") setView("library");
      return;
    }

    if (isTypingTarget(e.target)) {
      if (e.key === "Escape") (e.target as HTMLElement).blur();
      return;
    }

    if (document.querySelector('[role="dialog"]')) return;

    if (e.key === "/" && !meta) {
      e.preventDefault();
      document.getElementById("library-search")?.focus();
      if (view !== "library") setView("library");
      return;
    }

    if (e.key === "n" && !meta) {
      e.preventDefault();
      openCreate("prompt");
      return;
    }

    if (view !== "library") return;

    if (e.key === "Escape") {
      setSelectedId(null);
      return;
    }

    if (!selected) return;

    if (e.key === "e" && !meta) {
      e.preventDefault();
      openEdit();
      return;
    }
    if (e.key === "c" && !meta) {
      e.preventDefault();
      void handleCopySelected();
      return;
    }
    if (e.key === "d" && !meta) {
      e.preventDefault();
      void handleDuplicate();
      return;
    }
    if (e.key === "f" && !meta) {
      e.preventDefault();
      void toggleFavorite(selected.id);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <div className="brand-row">
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 32 32" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="24"
                  height="24"
                  rx="8"
                  fill="url(#cuebox-mark)"
                />
                <path
                  d="M11 16.5h10M16 11.5v10"
                  stroke="#03121b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient
                    id="cuebox-mark"
                    x1="4"
                    y1="4"
                    x2="28"
                    y2="28"
                  >
                    <stop stopColor="#00e5ff" />
                    <stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <p className="brand">Cuebox</p>
          </div>
          <p className="tagline">
            Сохраняйте промпты, подставляйте переменные и копируйте в любимый
            ИИ
          </p>
        </div>

        <SiteNav active={view} onCreate={() => openCreate("prompt")} />

        <div className="header-actions">
          <AuthStatus />
          {ready && mode === "local" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (
                  window.confirm(
                    "Сбросить библиотеку к демо-данным? Текущие записи будут заменены.",
                  )
                ) {
                  resetToSeed();
                  setSelectedId(null);
                }
              }}
            >
              Сброс демо
            </button>
          ) : null}
        </div>
      </header>

      {mode === "local" ? (
        <p className="sync-banner">
          Сейчас данные только в этом браузере.{" "}
          <a href="/register">Создайте аккаунт</a>, чтобы синхронизировать
          библиотеку между устройствами.
        </p>
      ) : null}

      {importPromptShown ? (
        <div className="sync-banner action">
          <span>
            Найдены локальные записи ({localItemCount}). Импортировать их в
            облачную библиотеку?
          </span>
          <span className="banner-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleImportLocal()}
            >
              Импортировать
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setImportPromptShown(false)}
            >
              Позже
            </button>
          </span>
        </div>
      ) : null}

      {view === "home" ? (
        <HomeDashboard
          onOpenItem={openItem}
          onOpenLibrary={() => setView("library")}
          onCreate={() => openCreate("prompt")}
        />
      ) : (
        <>
          <Toolbar
            onCreate={openCreate}
            onImportClick={() => fileRef.current?.click()}
          />

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />

          <div className="workspace">
            <FolderSidebar />
            <aside className="sidebar">
              <div className="pane-label">Библиотека</div>
              <ItemList
                selectedId={selectedId}
                onSelect={(item) => setSelectedId(item.id)}
              />
            </aside>
            <main className="main-pane">
              <ItemDetail
                item={selected}
                onEdit={openEdit}
                onDelete={() => void handleDelete()}
                onDuplicate={() => void handleDuplicate()}
              />
            </main>
          </div>
        </>
      )}

      <ItemEditor
        open={editorVisible}
        initial={createFromUrl ? null : editing}
        defaultKind={defaultKind}
        defaultCollectionId={defaultCollectionId}
        onClose={closeEditor}
        onSave={(draft, id) => void handleSave(draft, id)}
      />
    </div>
  );
}

export function AppShell() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <p className="list-empty">Загрузка Cuebox…</p>
        </div>
      }
    >
      <AppShellInner />
    </Suspense>
  );
}
