import { useState, useEffect } from "react";
import { Camera, Trash2, RotateCcw, X } from "lucide-react";
import { useStore } from "../store";

export default function SnapshotManager({ onClose }) {
  const { state, actions } = useStore();
  const [newName, setNewName] = useState("");

  useEffect(() => {
    actions.loadSnapshotsForSystem();
  }, []);

  const snaps = state.allSnapshots || [];

  function handleSave() {
    const name = newName.trim() || `Snapshot ${new Date().toLocaleString()}`;
    actions.saveSnapshot(name);
    setNewName("");
  }

  return (
    <div className="snapshot-panel">
      <div className="snapshot-panel__header">
        <Camera size={15} />
        <span>Named Snapshots</span>
        <button className="icon-btn" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="snapshot-panel__save">
        <input
          className="field-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") handleSave();
          }}
          placeholder="Snapshot name…"
        />
        <button className="btn btn--primary" onClick={handleSave}>
          Save
        </button>
      </div>

      {snaps.length === 0 ? (
        <p className="snapshot-panel__empty">No snapshots yet.</p>
      ) : (
        <ul className="snapshot-panel__list">
          {[...snaps]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((s) => (
              <li key={s.id} className="snapshot-panel__item">
                <span className="snapshot-panel__name">{s.name}</span>
                <span className="snapshot-panel__date">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
                <button
                  className="icon-btn"
                  title="Restore"
                  onClick={() => {
                    actions.loadSnapshot(s);
                    onClose();
                  }}>
                  <RotateCcw size={13} />
                </button>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  onClick={() => actions.deleteSnapshot(s.id)}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
