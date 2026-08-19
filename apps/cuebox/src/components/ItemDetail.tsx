"use client";

import { useMemo, useState } from "react";
import { VariableFillModal } from "@/components/VariableFillModal";
import { folderPath } from "@/lib/collections";
import { useLibrary } from "@/lib/library-context";
import { itemPlainText } from "@/lib/storage";
import {
  effectiveBody,
  extractPlaceholders,
  KIND_LABELS,
  type LibraryItem,
  type PromptVariant,
} from "@/lib/types";

export function ItemDetail({
  item,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  item: LibraryItem | null;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const {
    collections,
    recordCopy,
    toggleArchived,
    editItem,
    setTagFilter,
    setCollectionFilter,
    setFavoritesOnly,
    setShowArchived,
  } = useLibrary();
  const [copied, setCopied] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);

  const body = item ? effectiveBody(item) : "";
  const placeholders = useMemo(
    () => (item ? extractPlaceholders(body) : []),
    [item, body],
  );

  const collectionName = item?.collectionId
    ? folderPath(collections, item.collectionId)
    : null;

  if (!item) {
    return (
      <div className="detail-empty">
        <p className="detail-empty-brand">Cuebox</p>
        <p>
          Выберите промпт слева — или откройте{" "}
          <a href="/explore">Explore</a> и импортируйте готовый.
        </p>
      </div>
    );
  }

  async function handleCopy(text?: string) {
    const payload = text ?? itemPlainText(item!);
    try {
      await navigator.clipboard.writeText(payload);
      await recordCopy(item!.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  async function setActiveVariant(variantId: string | null) {
    try {
      await editItem(item!.id, { activeVariantId: variantId });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function addVariant() {
    const name = window.prompt("Название варианта", `Вариант ${item!.variants.length + 1}`);
    if (!name?.trim()) return;
    const variant: PromptVariant = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `var-${Date.now()}`,
      name: name.trim(),
      body: item!.body,
      createdAt: new Date().toISOString(),
    };
    try {
      await editItem(item!.id, {
        variants: [...item!.variants, variant],
        activeVariantId: variant.id,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Ошибка");
    }
  }

  return (
    <article className="detail-panel">
      <header className="detail-head">
        <div>
          <span className={`kind-badge kind-${item.kind}`}>
            {KIND_LABELS[item.kind]}
          </span>
          {collectionName ? (
            <button
              type="button"
              className="collection-chip"
              onClick={() => {
                if (!item.collectionId) return;
                setCollectionFilter(item.collectionId);
                setFavoritesOnly(false);
                setShowArchived(false);
              }}
            >
              {collectionName}
            </button>
          ) : null}
          {item.archived ? <span className="collection-chip">Архив</span> : null}
          <h2>{item.title}</h2>
          <p className="usage-line">
            Копирований: <strong>{item.copyCount ?? 0}</strong>
            {item.lastUsedAt
              ? ` · последний раз ${new Date(item.lastUsedAt).toLocaleString("ru-RU")}`
              : ""}
          </p>
        </div>
        <div className="detail-actions">
          {placeholders.length > 0 || item.variableDefs.length > 0 ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFillOpen(true)}
            >
              Подставить
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void handleCopy()}
          >
            {copied ? "Скопировано" : "Копировать"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onDuplicate}>
            Дублировать
          </button>
          <button type="button" className="btn btn-ghost" onClick={onEdit}>
            Изменить
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void toggleArchived(item.id)}
          >
            {item.archived ? "Из архива" : "В архив"}
          </button>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Удалить
          </button>
        </div>
      </header>

      {item.models.length ? (
        <div className="tag-row detail-tags">
          {item.models.map((model) => (
            <span key={model} className="tag model-tag">
              {model}
            </span>
          ))}
        </div>
      ) : null}

      {item.tags.length ? (
        <div className="tag-row detail-tags">
          {item.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag tag-button"
              onClick={() => {
                setTagFilter(tag);
                setFavoritesOnly(false);
                setShowArchived(false);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      {item.preset?.plugin ||
      item.preset?.pluginType ||
      item.preset?.source ? (
        <div className="preset-meta">
          {item.preset.plugin ? <span>{item.preset.plugin}</span> : null}
          {item.preset.pluginType ? <span>{item.preset.pluginType}</span> : null}
          {item.preset.source ? <span>{item.preset.source}</span> : null}
          {item.preset.bpm ? <span>{item.preset.bpm} BPM</span> : null}
          {item.preset.key ? <span>{item.preset.key}</span> : null}
        </div>
      ) : null}

      {collections.length ? (
        <label className="move-field">
          <span>Папка</span>
          <select
            value={item.collectionId ?? ""}
            onChange={(e) => {
              void editItem(item.id, {
                collectionId: e.target.value || null,
              }).catch((err: unknown) => {
                window.alert(
                  err instanceof Error ? err.message : "Не удалось переместить",
                );
              });
            }}
          >
            <option value="">Без папки</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {folderPath(collections, c.id)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {item.kind === "prompt" || item.kind === "task" || item.kind === "tip" ? (
        <div className="variants-bar">
          <button
            type="button"
            className={
              !item.activeVariantId ? "kind-tab active" : "kind-tab"
            }
            onClick={() => void setActiveVariant(null)}
          >
            Основной
          </button>
          {item.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              className={
                item.activeVariantId === variant.id
                  ? "kind-tab active"
                  : "kind-tab"
              }
              onClick={() => void setActiveVariant(variant.id)}
            >
              {variant.name}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => void addVariant()}>
            + Вариант
          </button>
        </div>
      ) : null}

      {item.kind === "chat" && item.messages?.length ? (
        <div className="chat-thread">
          {item.body ? <p className="chat-summary">{item.body}</p> : null}
          {item.messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`chat-bubble role-${message.role}`}
            >
              <span className="chat-role">{message.role}</span>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <pre className="body-block">{body}</pre>
      )}

      <VariableFillModal
        key={`${item.id}-${fillOpen}`}
        item={item}
        open={fillOpen}
        onClose={() => setFillOpen(false)}
        onCopy={(text) => {
          void handleCopy(text);
          setFillOpen(false);
        }}
      />
    </article>
  );
}
