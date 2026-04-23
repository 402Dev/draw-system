import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "../store";

const STATUS_OPTIONS = ["", "planned", "active", "deprecated", "critical"];

export default function BulkEditPanel({ selectedIds, onClose }) {
  const { state, actions } = useStore();
  const [color, setColor] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("");

  if (!selectedIds || selectedIds.length < 2) return null;

  function applyColor() {
    if (!color) return;
    selectedIds.forEach((id) => actions.updateElement(id, { data: { color } }));
  }

  function applyTag() {
    const t = tag.trim();
    if (!t) return;
    selectedIds.forEach((id) => {
      const el = state.elements.find((e) => e.id === id);
      const existing =
        typeof el?.data?.tags === "string"
          ? el.data.tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : el?.data?.tags || [];
      if (!existing.includes(t)) {
        actions.updateElement(id, {
          data: { tags: [...existing, t].join(",") },
        });
      }
    });
    setTag("");
  }

  function applyStatus() {
    if (!status) return;
    selectedIds.forEach((id) =>
      actions.updateElement(id, { data: { status } }),
    );
  }

  return (
    <div className="bulk-edit-panel">
      <div className="bulk-edit-panel__header">
        <span>Bulk Edit ({selectedIds.length} nodes)</span>
        <button className="icon-btn" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="bulk-edit-panel__row">
        <label className="field-label">Color</label>
        <div className="color-row">
          <input
            type="color"
            className="color-input"
            value={color || "#6366f1"}
            onChange={(e) => setColor(e.target.value)}
          />
          <button className="btn btn--ghost" onClick={applyColor}>
            Apply to all
          </button>
        </div>
      </div>
      <div className="bulk-edit-panel__row">
        <label className="field-label">Add Tag</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="field-input"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") applyTag();
            }}
            placeholder="Tag name…"
          />
          <button className="btn btn--ghost" onClick={applyTag}>
            Add
          </button>
        </div>
      </div>
      <div className="bulk-edit-panel__row">
        <label className="field-label">Status</label>
        <div style={{ display: "flex", gap: 6 }}>
          <select
            className="field-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : "— pick status —"}
              </option>
            ))}
          </select>
          <button className="btn btn--ghost" onClick={applyStatus}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
