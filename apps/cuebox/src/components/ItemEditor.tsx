"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { folderPath } from "@/lib/collections";
import { useLibrary } from "@/lib/library-context";
import type {
  AiModel,
  AudioPluginType,
  ChatMessage,
  ItemDraft,
  ItemKind,
  LibraryItem,
  VariableDef,
  VariableType,
} from "@/lib/types";
import {
  AI_MODELS,
  createVariableDefsFromBody,
  KIND_LABELS,
  KIND_ORDER,
  VARIABLE_TYPES,
  AUDIO_PLUGIN_TYPES,
} from "@/lib/types";

interface ItemEditorProps {
  open: boolean;
  initial?: LibraryItem | null;
  defaultKind?: ItemKind;
  defaultCollectionId?: string;
  onClose: () => void;
  onSave: (draft: ItemDraft, id?: string) => void;
}

function ItemEditorForm({
  initial,
  defaultKind,
  defaultCollectionId,
  onClose,
  onSave,
}: {
  initial?: LibraryItem | null;
  defaultKind: ItemKind;
  defaultCollectionId?: string;
  onClose: () => void;
  onSave: (draft: ItemDraft, id?: string) => void;
}) {
  const titleId = useId();
  const { collections } = useLibrary();
  const [kind, setKind] = useState<ItemKind>(initial?.kind ?? defaultKind);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [collectionId, setCollectionId] = useState(
    initial?.collectionId ?? defaultCollectionId ?? "",
  );
  const [models, setModels] = useState<AiModel[]>(initial?.models ?? []);
  const [plugin, setPlugin] = useState(initial?.preset?.plugin ?? "");
  const [pluginType, setPluginType] = useState<AudioPluginType>(
    initial?.preset?.pluginType ?? "other",
  );
  const [source, setSource] = useState(initial?.preset?.source ?? "");
  const [bpm, setBpm] = useState(initial?.preset?.bpm ?? "");
  const [musicalKey, setMusicalKey] = useState(initial?.preset?.key ?? "");
  const [variableDefs, setVariableDefs] = useState<VariableDef[]>(
    initial?.variableDefs?.length
      ? initial.variableDefs
      : createVariableDefsFromBody(initial?.body ?? ""),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    initial?.messages?.length
      ? initial.messages
      : [{ role: "user", content: "" }],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleModel(model: AiModel) {
    setModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  }

  function updateMessage(index: number, patch: Partial<ChatMessage>) {
    setMessages((prev) =>
      prev.map((msg, i) => (i === index ? { ...msg, ...patch } : msg)),
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Укажите название");
      return;
    }
    if (!body.trim() && kind !== "chat") {
      setError("Добавьте текст");
      return;
    }

    const cleanedMessages =
      kind === "chat"
        ? messages
            .map((m) => ({ role: m.role, content: m.content.trim() }))
            .filter((m) => m.content)
        : undefined;

    if (kind === "chat" && !body.trim() && !cleanedMessages?.length) {
      setError("Добавьте описание или сообщения чата");
      return;
    }

    const draft: ItemDraft = {
      kind,
      title,
      body: body || title,
      tags: tags
        .split(/[,;#]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      messages: cleanedMessages,
      favorite: initial?.favorite,
      archived: initial?.archived ?? false,
      models,
      preset:
        plugin || source || bpm || musicalKey || pluginType !== "other"
          ? {
              plugin: plugin.trim() || undefined,
              pluginType,
              source: source.trim() || undefined,
              bpm: bpm.trim() || undefined,
              key: musicalKey.trim() || undefined,
            }
          : {},
      variableDefs,
      variants: initial?.variants ?? [],
      activeVariantId: initial?.activeVariantId ?? null,
      collectionId: collectionId || null,
    };

    onSave(draft, initial?.id);
    onClose();
  }

  return (
    <div className="modal-root" role="presentation" onClick={onClose}>
      <div
        className="modal-panel wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2 id={titleId}>{initial ? "Редактировать" : "Новый элемент"}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <form className="editor-form" onSubmit={handleSubmit}>
          <fieldset className="kind-picker">
            <legend>Тип</legend>
            <div className="kind-picker-row">
              {KIND_ORDER.map((k) => (
                <label key={k} className={kind === k ? "pill active" : "pill"}>
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                  />
                  {KIND_LABELS[k]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>Название</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Краткое имя"
              autoFocus
            />
          </label>

          <label className="field">
            <span>{kind === "chat" ? "Краткое описание" : "Текст"}</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={kind === "chat" ? 3 : 10}
              placeholder="Промпт с {{variable}} или {variable}…"
            />
          </label>

          {kind === "chat" ? (
            <div className="chat-editor">
              <div className="chat-editor-head">
                <span>Сообщения</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setMessages((prev) => [
                      ...prev,
                      { role: "assistant", content: "" },
                    ])
                  }
                >
                  + Сообщение
                </button>
              </div>
              {messages.map((msg, index) => (
                <div key={index} className="chat-editor-row">
                  <select
                    value={msg.role}
                    onChange={(e) =>
                      updateMessage(index, {
                        role: e.target.value as ChatMessage["role"],
                      })
                    }
                  >
                    <option value="user">user</option>
                    <option value="assistant">assistant</option>
                    <option value="system">system</option>
                  </select>
                  <textarea
                    value={msg.content}
                    onChange={(e) =>
                      updateMessage(index, { content: e.target.value })
                    }
                    rows={3}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setMessages((prev) => prev.filter((_, i) => i !== index))
                    }
                    disabled={messages.length <= 1}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <fieldset className="kind-picker">
            <legend>Модели ИИ</legend>
            <div className="kind-picker-row">
              {AI_MODELS.map((model) => (
                <label
                  key={model}
                  className={models.includes(model) ? "pill active" : "pill"}
                >
                  <input
                    type="checkbox"
                    checked={models.includes(model)}
                    onChange={() => toggleModel(model)}
                  />
                  {model}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="kind-picker">
            <legend>Preset / plugin metadata</legend>
            <div className="vars-editor">
              <div className="var-row">
                <input
                  value={plugin}
                  placeholder="Plugin, e.g. Valhalla VintageVerb"
                  onChange={(e) => setPlugin(e.target.value)}
                />
                <select
                  value={pluginType}
                  onChange={(e) => setPluginType(e.target.value as AudioPluginType)}
                >
                  {AUDIO_PLUGIN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="var-row">
                <input
                  value={source}
                  placeholder="Source, e.g. lead vocal / drum bus"
                  onChange={(e) => setSource(e.target.value)}
                />
                <input
                  value={bpm}
                  placeholder="BPM"
                  onChange={(e) => setBpm(e.target.value)}
                />
                <input
                  value={musicalKey}
                  placeholder="Key"
                  onChange={(e) => setMusicalKey(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          {kind !== "chat" ? (
            <div className="vars-editor">
              <div className="chat-editor-head">
                <span>Переменные</span>
                <div className="banner-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setVariableDefs(createVariableDefsFromBody(body))
                    }
                  >
                    Из текста
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setVariableDefs((prev) => [
                        ...prev,
                        {
                          key: `var${prev.length + 1}`,
                          label: "",
                          type: "text",
                          defaultValue: "",
                        },
                      ])
                    }
                  >
                    + Переменная
                  </button>
                </div>
              </div>
              {variableDefs.map((def, index) => (
                <div key={index} className="var-row">
                  <input
                    value={def.key}
                    placeholder="key"
                    onChange={(e) =>
                      setVariableDefs((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, key: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <input
                    value={def.label ?? ""}
                    placeholder="Подпись"
                    onChange={(e) =>
                      setVariableDefs((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, label: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <select
                    value={def.type}
                    onChange={(e) =>
                      setVariableDefs((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, type: e.target.value as VariableType }
                            : row,
                        ),
                      )
                    }
                  >
                    {VARIABLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    value={def.defaultValue ?? ""}
                    placeholder="default"
                    onChange={(e) =>
                      setVariableDefs((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, defaultValue: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                  {def.type === "dropdown" ? (
                    <input
                      value={(def.options ?? []).join(", ")}
                      placeholder="опции через запятую"
                      onChange={(e) =>
                        setVariableDefs((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  options: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                }
                              : row,
                          ),
                        )
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setVariableDefs((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {collections.length ? (
            <label className="field">
              <span>Папка / коллекция</span>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
              >
                <option value="">Без коллекции</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {folderPath(collections, c.id)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field">
            <span>Теги</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="engineering, docs, brand"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <footer className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export function ItemEditor({
  open,
  initial,
  defaultKind = "prompt",
  defaultCollectionId,
  onClose,
  onSave,
}: ItemEditorProps) {
  if (!open) return null;
  const formKey = initial?.id ?? `new-${defaultKind}-${defaultCollectionId ?? ""}`;
  return (
    <ItemEditorForm
      key={formKey}
      initial={initial}
      defaultKind={defaultKind}
      defaultCollectionId={defaultCollectionId}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
