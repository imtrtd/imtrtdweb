"use client";

import { useMemo, useState } from "react";
import type { LibraryItem, VariableDef } from "@/lib/types";
import {
  applyPlaceholders,
  createVariableDefsFromBody,
  effectiveBody,
} from "@/lib/types";

export function VariableFillModal({
  item,
  open,
  onClose,
  onCopy,
}: {
  item: LibraryItem;
  open: boolean;
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  const body = effectiveBody(item);
  const defs = useMemo(() => {
    const fromItem = item.variableDefs?.length
      ? item.variableDefs
      : createVariableDefsFromBody(body);
    const keys = new Set(fromItem.map((d) => d.key));
    const extras = createVariableDefsFromBody(body).filter(
      (d) => !keys.has(d.key),
    );
    return [...fromItem, ...extras];
  }, [item.variableDefs, body]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const def of defs) {
      if (def.type === "toggle") {
        initial[def.key] = def.defaultValue === "true" ? "true" : "false";
      } else {
        initial[def.key] = def.defaultValue ?? "";
      }
    }
    return initial;
  });

  if (!open) return null;

  const filled = applyPlaceholders(body, values);

  function renderInput(def: VariableDef) {
    if (def.type === "dropdown") {
      return (
        <select
          value={values[def.key] ?? ""}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, [def.key]: e.target.value }))
          }
        >
          <option value="">—</option>
          {(def.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    if (def.type === "toggle") {
      return (
        <label className="check-line">
          <input
            type="checkbox"
            checked={values[def.key] === "true"}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                [def.key]: e.target.checked ? "true" : "false",
              }))
            }
          />
          {values[def.key] === "true" ? "Да" : "Нет"}
        </label>
      );
    }
    if (def.type === "date") {
      return (
        <input
          type="date"
          value={values[def.key] ?? ""}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, [def.key]: e.target.value }))
          }
        />
      );
    }
    return (
      <textarea
        rows={2}
        value={values[def.key] ?? ""}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, [def.key]: e.target.value }))
        }
      />
    );
  }

  return (
    <div className="modal-root" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>Подстановка переменных</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>
        <div className="editor-form">
          {defs.length === 0 ? (
            <p className="muted">В промпте нет переменных.</p>
          ) : (
            defs.map((def) => (
              <label key={def.key} className="field">
                <span>
                  {def.label || def.key}{" "}
                  <code className="var-code">{`{{${def.key}}}`}</code>
                </span>
                {renderInput(def)}
              </label>
            ))
          )}
          <pre className="body-block">{filled}</pre>
          <footer className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Закрыть
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onCopy(filled)}
            >
              Копировать результат
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
