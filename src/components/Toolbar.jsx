import { useState, useRef, useEffect } from "react";
import { useStore } from "../store";
import { exportPDF } from "../utils/exportPDF";
import {
  FileDown,
  Settings,
  Upload,
  Download,
  Undo2,
  Redo2,
  LayoutDashboard,
  Eye,
  EyeOff,
  Camera,
  Search,
  FileText,
  Image,
  Code2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useReactFlow } from "reactflow";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import SnapshotManager from "./SnapshotManager";
import HelpModal from "./HelpModal";
import { HelpCircle } from "lucide-react";

export default function Toolbar({ onSearch }) {
  const { state, actions } = useStore();
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const importRef = useRef(null);
  const exportMenuRef = useRef(null);
  const rfInstance = useReactFlow();

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    function handler(e) {
      if (!exportMenuRef.current?.contains(e.target)) setShowExportMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  async function handleExport() {
    setExporting(true);
    const currentViewport = rfInstance ? rfInstance.getViewport() : null;
    try {
      await exportPDF(state, rfInstance);
    } finally {
      if (rfInstance && currentViewport) {
        rfInstance.setViewport(currentViewport);
      }
      setExporting(false);
    }
  }

  function handleExportJSON() {
    const json = JSON.stringify(
      {
        system: state.system,
        elements: state.elements,
        interactions: state.interactions,
      },
      null,
      2,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.system.title || "causal-map"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (!json.system || !json.elements || !json.interactions) {
          alert("Invalid map file.");
          return;
        }
        actions.importState(json);
      } catch {
        alert("Could not read file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleExportCSV() {
    const { elements, interactions } = state;
    const elById = Object.fromEntries(elements.map((e) => [e.id, e]));

    // Elements sheet
    const elHeaders = [
      "id",
      "label",
      "type",
      "status",
      "url",
      "tags",
      "attributes",
    ];
    const elRows = elements.map((el) => [
      el.id,
      el.data?.label || "",
      el.type || "iconNode",
      el.data?.status || "",
      el.data?.url || "",
      (el.data?.tags || []).join("; "),
      (el.data?.attributes || []).map((a) => `${a.key}:${a.value}`).join("; "),
    ]);

    const ixHeaders = [
      "id",
      "source",
      "target",
      "direction",
      "nature",
      "edgeLabel",
    ];
    const ixRows = interactions.map((ix) => [
      ix.id,
      elById[ix.source]?.data?.label || ix.source,
      elById[ix.target]?.data?.label || ix.target,
      ix.data?.isBidirectional ? "bidirectional" : "one-way",
      ix.data?.natureOfInteraction || ix.data?.natureAtoB || "",
      ix.data?.edgeLabel || "",
    ]);

    function toCSV(headers, rows) {
      const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
      return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    }

    const combined = `ELEMENTS\n${toCSV(elHeaders, elRows)}\n\nINTERACTIONS\n${toCSV(ixHeaders, ixRows)}`;
    const blob = new Blob([combined], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.system.title || "causal-map"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Take a screenshot of the canvas.
  // We capture document.body (not the .react-flow element directly) and crop
  // to the container's bounding rect. This completely bypasses overflow:hidden
  // on the container — html2canvas creates a canvas sized to the target
  // element's layout box, so capturing the container directly would still clip
  // any node that extends beyond its offsetWidth/offsetHeight even when
  // overflow:visible is set.
  async function captureCanvas(scale = 2) {
    const container = document.querySelector(".react-flow");
    if (!container || !rfInstance) return null;

    rfInstance.fitView({ padding: 0.3, duration: 0 });

    // Let overflow:visible render nodes that sit at the very edge so they
    // appear in the body paint tree before we snapshot.
    const noClipStyle = document.createElement("style");
    noClipStyle.id = "rf-export-noclip";
    noClipStyle.textContent =
      ".react-flow,.react-flow__renderer,.react-flow__container,.react-flow__pane" +
      "{overflow:visible!important;clip:auto!important}";
    document.head.appendChild(noClipStyle);

    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    await new Promise((r) => setTimeout(r, 200));

    const rect = container.getBoundingClientRect();
    const { default: html2canvas } = await import("html2canvas");

    // Render document.body and crop to the react-flow area.
    // document.body has no overflow:hidden constraint on our nodes, so the
    // canvas includes every pixel that the browser renders in that region.
    const canvas = await html2canvas(document.body, {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      backgroundColor: "#0f1117",
      scale,
      useCORS: true,
      logging: false,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    noClipStyle.remove();
    return canvas;
  }

  async function handleExportPNG() {
    const canvas = await captureCanvas(3);
    if (!canvas) return;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.system.title || "causal-map"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function handleExportHTML() {
    // Generate a standalone HTML file with embedded canvas screenshot + data table
    let imgDataUrl = "";
    const canvas = await captureCanvas(2);
    if (canvas) imgDataUrl = canvas.toDataURL("image/png");

    const { elements, interactions, system } = state;
    const elById = Object.fromEntries(elements.map((e) => [e.id, e]));
    const author = system.author || "";
    const org = system.organization || "";

    const elRows = elements
      .filter((e) => e.type !== "stickyNote")
      .map(
        (el) =>
          `<tr><td>${el.data?.label || ""}</td><td>${el.type === "cardNode" ? "Schema Card" : el.type === "groupNode" ? "Group" : "Element"}</td><td>${el.data?.status || ""}</td><td>${(el.data?.tags || []).join(", ")}</td><td>${el.data?.url ? `<a href="${el.data.url}" target="_blank">Link</a>` : ""}</td></tr>`,
      )
      .join("");

    const ixRows = interactions
      .map(
        (ix) =>
          `<tr><td>${elById[ix.source]?.data?.label || ix.source}</td><td>${ix.data?.isBidirectional ? "⇄" : "→"}</td><td>${elById[ix.target]?.data?.label || ix.target}</td><td>${ix.data?.edgeLabel || ""}</td></tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${system.title || "Causal Map"}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f1117; color: #e0e0f0; margin: 0; padding: 24px; }
  h1 { font-size: 1.8rem; margin: 0 0 4px; }
  .meta { color: #9898b3; font-size: 0.82rem; margin-bottom: 24px; }
  img { max-width: 100%; border-radius: 8px; border: 1px solid #2e2e4a; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  th { background: #1e1e35; color: #c7c7d4; font-size: 0.78rem; padding: 6px 10px; text-align: left; }
  td { padding: 5px 10px; font-size: 0.82rem; border-bottom: 1px solid #2e2e4a; }
  h2 { font-size: 1.1rem; color: #6366f1; margin: 32px 0 10px; }
  a { color: #818cf8; }
</style>
</head>
<body>
<h1>${system.title || "Causal Map"}</h1>
<p class="meta">${org ? `${org} · ` : ""}${author ? `Author: ${author} · ` : ""}Generated ${new Date().toLocaleDateString()}</p>
${imgDataUrl ? `<img src="${imgDataUrl}" alt="Architecture diagram" />` : ""}
<h2>Elements (${elements.filter((e) => e.type !== "stickyNote").length})</h2>
<table><thead><tr><th>Label</th><th>Type</th><th>Status</th><th>Tags</th><th>Link</th></tr></thead><tbody>${elRows}</tbody></table>
<h2>Interactions (${interactions.length})</h2>
<table><thead><tr><th>From</th><th>Dir</th><th>To</th><th>Label</th></tr></thead><tbody>${ixRows}</tbody></table>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${system.title || "causal-map"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSearchChange(q) {
    setSearchQuery(q);
    if (onSearch) onSearch(q);
  }

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z / Ctrl+Y redo, Ctrl+F search
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        actions.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // actions.undo / actions.redo are useCallback(fn, []) — stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.undo, actions.redo]);

  return (
    <div
      className={`toolbar${state.presentationMode ? " toolbar--presentation" : ""}`}>
      <div className="toolbar__left">
        {!state.presentationMode && <WorkspaceSwitcher />}
        <input
          className="toolbar__title"
          value={state.system.title}
          onChange={(e) => actions.updateSystem({ title: e.target.value })}
          placeholder="System title…"
          readOnly={state.presentationMode}
        />
        {!state.presentationMode && (
          <>
            <button
              className="icon-btn toolbar__purpose-btn"
              title="Edit system purpose"
              onClick={() => setEditingPurpose((v) => !v)}>
              <Settings size={16} />
              <span>Purpose</span>
            </button>
            <button
              className="icon-btn"
              title="Undo (Ctrl+Z)"
              onClick={() => actions.undo()}
              disabled={!actions.canUndo}>
              <Undo2 size={16} />
            </button>
            <button
              className="icon-btn"
              title="Redo (Ctrl+Shift+Z)"
              onClick={() => actions.redo()}
              disabled={!actions.canRedo}>
              <Redo2 size={16} />
            </button>
            <button
              className="icon-btn"
              title="Auto-arrange layout"
              onClick={() => actions.autoLayout("LR")}>
              <LayoutDashboard size={16} />
              <span>Auto Layout</span>
            </button>
          </>
        )}
      </div>

      <div className="toolbar__right">
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={handleImportJSON}
        />

        {!state.presentationMode && (
          <>
            {/* Search toggle */}
            {showSearch ? (
              <input
                autoFocus
                className="toolbar__search-input"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    setShowSearch(false);
                    handleSearchChange("");
                  }
                }}
                placeholder="Search elements…"
              />
            ) : (
              <button
                className="icon-btn"
                title="Search elements (Ctrl+F)"
                onClick={() => setShowSearch(true)}>
                <Search size={15} />
              </button>
            )}

            {/* Snapshots */}
            <button
              className="icon-btn"
              title="Named Snapshots"
              onClick={() => setShowSnapshots((v) => !v)}>
              <Camera size={15} />
            </button>

            {/* Export dropdown */}
            <div className="export-dropdown" ref={exportMenuRef}>
              <button
                className="btn btn--ghost export-dropdown__trigger"
                onClick={() => setShowExportMenu((v) => !v)}>
                <Download size={15} />
                Export
                <span
                  className={`export-dropdown__chevron ${showExportMenu ? "export-dropdown__chevron--open" : ""}`}>
                  ▾
                </span>
              </button>
              {showExportMenu && (
                <div className="export-dropdown__menu">
                  <button
                    className="export-dropdown__item"
                    onClick={() => {
                      importRef.current?.click();
                      setShowExportMenu(false);
                    }}>
                    <Upload size={14} /> Import JSON
                  </button>
                  <div className="export-dropdown__sep" />
                  <button
                    className="export-dropdown__item"
                    onClick={() => {
                      handleExportJSON();
                      setShowExportMenu(false);
                    }}>
                    <Download size={14} /> Save JSON
                  </button>
                  <button
                    className="export-dropdown__item"
                    onClick={() => {
                      handleExportCSV();
                      setShowExportMenu(false);
                    }}>
                    <FileText size={14} /> Export CSV
                  </button>
                  <button
                    className="export-dropdown__item"
                    onClick={() => {
                      handleExportPNG();
                      setShowExportMenu(false);
                    }}>
                    <Image size={14} /> Export PNG
                  </button>
                  <button
                    className="export-dropdown__item"
                    onClick={() => {
                      handleExportHTML();
                      setShowExportMenu(false);
                    }}>
                    <Code2 size={14} /> Export HTML
                  </button>
                  <div className="export-dropdown__sep" />
                  <button
                    className="export-dropdown__item export-dropdown__item--primary"
                    disabled={exporting}
                    onClick={() => {
                      handleExport();
                      setShowExportMenu(false);
                    }}>
                    <FileDown size={14} />{" "}
                    {exporting ? "Exporting…" : "Export PDF"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <button
          className={`btn ${state.presentationMode ? "btn--primary" : "btn--ghost"}`}
          onClick={() => actions.togglePresentation()}
          title={
            state.presentationMode
              ? "Exit presentation mode"
              : "Enter presentation mode"
          }>
          {state.presentationMode ? <EyeOff size={15} /> : <Eye size={15} />}
          {state.presentationMode ? "Exit" : "Present"}
        </button>
        <button
          className="icon-btn"
          title="Help & Guide"
          onClick={() => setShowHelp(true)}>
          <HelpCircle size={16} />
        </button>
      </div>

      {/* Snapshot manager panel */}
      {showSnapshots && (
        <SnapshotManager onClose={() => setShowSnapshots(false)} />
      )}

      {/* Help modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {editingPurpose && (
        <div className="purpose-panel">
          <div className="purpose-panel__header">
            <span>System Info & Branding</span>
            <button
              className="toggle-btn"
              onClick={() => setEditingPurpose(false)}>
              Done
            </button>
          </div>
          <label className="field-label">Purpose</label>
          <textarea
            className="field-textarea"
            value={state.system.purpose}
            onChange={(e) => actions.updateSystem({ purpose: e.target.value })}
            placeholder="Describe the reason this system exists (Markdown supported)…"
            rows={4}
          />
          <label className="field-label" style={{ marginTop: 10 }}>
            Author
          </label>
          <input
            className="field-input"
            value={state.system.author || ""}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => actions.updateSystem({ author: e.target.value })}
            placeholder="Author name…"
          />
          <label className="field-label" style={{ marginTop: 10 }}>
            Organization
          </label>
          <input
            className="field-input"
            value={state.system.organization || ""}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) =>
              actions.updateSystem({ organization: e.target.value })
            }
            placeholder="Company / department…"
          />
          <label className="field-label" style={{ marginTop: 10 }}>
            Logo URL (for PDF cover)
          </label>
          <input
            className="field-input"
            type="url"
            value={state.system.logoUrl || ""}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => actions.updateSystem({ logoUrl: e.target.value })}
            placeholder="https://…/logo.png"
          />
        </div>
      )}
    </div>
  );
}
