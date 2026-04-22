import { useState, useRef } from "react";
import { useStore } from "../store";
import { exportPDF } from "../utils/exportPDF";
import { FileDown, Settings } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useReactFlow } from "reactflow";

export default function Toolbar() {
  const { state, actions } = useStore();
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [exporting, setExporting] = useState(false);
  const rfInstance = useReactFlow();

  async function handleExport() {
    setExporting(true);
    // Save current viewport
    const currentViewport = rfInstance ? rfInstance.getViewport() : null;
    try {
      await exportPDF(state, rfInstance);
    } finally {
      // Restore previous viewport if available
      if (rfInstance && currentViewport) {
        rfInstance.setViewport(currentViewport);
      }
      setExporting(false);
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar__left">
        <input
          className="toolbar__title"
          value={state.system.title}
          onChange={(e) => actions.updateSystem({ title: e.target.value })}
          placeholder="System title…"
        />
        <button
          className="icon-btn toolbar__purpose-btn"
          title="Edit system purpose"
          onClick={() => setEditingPurpose((v) => !v)}>
          <Settings size={16} />
          <span>Purpose</span>
        </button>
      </div>

      <div className="toolbar__right">
        <button
          className="btn btn--primary"
          onClick={handleExport}
          disabled={exporting}>
          <FileDown size={16} />
          {exporting ? "Exporting…" : "Export System Document"}
        </button>
      </div>

      {editingPurpose && (
        <div className="purpose-panel">
          <div className="purpose-panel__header">
            <span>System Purpose</span>
            <button
              className="toggle-btn"
              onClick={() => setEditingPurpose(false)}>
              Done
            </button>
          </div>
          <textarea
            className="field-textarea"
            value={state.system.purpose}
            onChange={(e) => actions.updateSystem({ purpose: e.target.value })}
            placeholder="Describe the reason this system exists (Markdown supported)…"
            rows={5}
          />
        </div>
      )}
    </div>
  );
}
