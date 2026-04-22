import { useState } from "react";
import { X } from "lucide-react";
import { TEMPLATES } from "../utils/templates";
import { useStore } from "../store";

export default function TemplateModal({ onClose }) {
  const { actions } = useStore();
  const [title, setTitle] = useState("New System");
  const [selected, setSelected] = useState("blank");

  function handleCreate() {
    const template = TEMPLATES.find((t) => t.id === selected);
    actions.createWorkspaceFromTemplate(title, template);
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__header">
          <span>New Workspace</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal__body">
          <label className="field-label">Workspace Name</label>
          <input
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="System title…"
            autoFocus
          />
          <label className="field-label" style={{ marginTop: 16 }}>
            Starter Template
          </label>
          <div className="template-grid">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className={`template-card${selected === t.id ? " template-card--active" : ""}`}
                onClick={() => setSelected(t.id)}>
                <span className="template-card__name">{t.label}</span>
                <span className="template-card__desc">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleCreate}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
