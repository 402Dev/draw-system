import { useState, useRef, useEffect } from "react";
import { useStore } from "../store";
import {
  exportPDF,
  captureCanvasLight,
  overlayEdgeSvgToCanvas,
} from "../utils/exportPDF";
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

    // Hide sticky notes and UI chrome from the diagram screenshot
    const hideUiStyle = document.createElement("style");
    hideUiStyle.id = "rf-export-hideui";
    hideUiStyle.textContent =
      ".react-flow__node-stickyNote,.react-flow__controls,.react-flow__minimap" +
      "{display:none!important}";
    document.head.appendChild(hideUiStyle);

    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    await new Promise((r) => setTimeout(r, 300));

    const rect = container.getBoundingClientRect();
    const cW = Math.round(rect.width);
    const cH = Math.round(rect.height);
    const { default: html2canvas } = await import("html2canvas");

    // Step 1 — capture HTML nodes (html2canvas cannot render SVG)
    const canvas = await html2canvas(document.body, {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: cW,
      height: cH,
      backgroundColor: "#0f1117",
      scale,
      useCORS: true,
      logging: false,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    // Step 2 — overlay edge SVG with explicit arrowheads
    try {
      await overlayEdgeSvgToCanvas({
        container,
        rfInstance,
        canvas,
        width: cW,
        height: cH,
        scale,
        strokeColor: "#818cf8",
        minStrokeWidth: 2.2,
        opacity: 0.94,
        arrowLength: 13,
        arrowWidth: 10,
      });
    } catch {
      // edge overlay failed — nodes are still captured
    }

    hideUiStyle.remove();
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
    const { elements, interactions, system } = state;
    const elById = Object.fromEntries(elements.map((e) => [e.id, e]));

    // Light-theme screenshot
    let imgDataUrl = "";
    const canvas = await captureCanvasLight(rfInstance);
    if (canvas) imgDataUrl = canvas.toDataURL("image/png");

    const iconNodes = elements.filter((e) => e.type === "iconNode");
    const groupNodes = elements.filter((e) => e.type === "groupNode");
    const cardNodes = elements.filter((e) => e.type === "cardNode");

    function esc(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    function strip(t) {
      return (t || "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/#{1,6}\s+/g, "")
        .replace(/`(.*?)`/g, "$1")
        .trim();
    }
    function tags(el) {
      const t = el.data?.tags;
      if (!t) return "";
      return (
        typeof t === "string"
          ? t
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : t
      ).join(", ");
    }

    // Components table
    const orderMap = { active: 0, planned: 1, critical: 2, deprecated: 3 };
    const sortedComponents = [...iconNodes].sort((a, b) => {
      const sa = orderMap[a.data?.status || ""] ?? 4;
      const sb = orderMap[b.data?.status || ""] ?? 4;
      return sa !== sb
        ? sa - sb
        : (a.data?.label || "").localeCompare(b.data?.label || "");
    });
    const componentRows = sortedComponents
      .map((el, i) => {
        const connects = interactions
          .filter(
            (ix) =>
              ix.source === el.id ||
              (ix.data?.isBidirectional && ix.target === el.id),
          )
          .map((ix) =>
            esc(
              elById[ix.source === el.id ? ix.target : ix.source]?.data
                ?.label || "?",
            ),
          )
          .join(", ");
        const bg = i % 2 === 0 ? "" : ' style="background:#f8f9fc"';
        return `<tr${bg}><td>${esc(el.data?.label)}</td><td><span class="badge badge-${esc(el.data?.status)}">${esc(el.data?.status || "")}</span></td><td>${esc(tags(el))}</td><td>${esc(strip(el.data?.purpose || el.data?.description || ""))}</td><td>${connects || "none"}</td>${el.data?.url ? `<td><a href="${esc(el.data.url)}" target="_blank" rel="noopener">Link</a></td>` : "<td></td>"}</tr>`;
      })
      .join("");

    // Subsystems section
    const subsystemBlocks = groupNodes
      .map((grp) => {
        const gx = grp.position.x,
          gy = grp.position.y;
        const gw = grp.style?.width || 200,
          gh = grp.style?.height || 120;
        const members = iconNodes.filter(
          (e) =>
            e.position.x >= gx &&
            e.position.x <= gx + gw &&
            e.position.y >= gy &&
            e.position.y <= gy + gh,
        );
        const memberList =
          members.length === 0
            ? '<p class="empty">No components inside this subsystem.</p>'
            : `<ul>${members.map((m) => `<li>${esc(m.data?.label || "Unnamed")}${m.data?.status ? ` <span class="badge badge-${esc(m.data?.status)}">${esc(m.data.status)}</span>` : ""}</li>`).join("")}</ul>`;
        return `<div class="subsystem"><div class="subsystem-name">${esc(grp.data?.label || "Unnamed Subsystem")}</div>${memberList}</div>`;
      })
      .join("");

    // Helper: find which group an element belongs to (by position bounds)
    function elementGroup(el) {
      for (const grp of groupNodes) {
        const gx = grp.position.x,
          gy = grp.position.y;
        const gw = grp.style?.width || 200,
          gh = grp.style?.height || 120;
        if (
          el.position.x >= gx &&
          el.position.x <= gx + gw &&
          el.position.y >= gy &&
          el.position.y <= gy + gh
        ) {
          return grp.data?.label || "Unnamed";
        }
      }
      return null;
    }
    function interactionScope(ix) {
      if (!groupNodes.length) return "";
      const srcEl = elById[ix.source],
        tgtEl = elById[ix.target];
      if (!srcEl || !tgtEl) return "";
      const sg = elementGroup(srcEl),
        tg = elementGroup(tgtEl);
      if (sg && tg && sg === tg) return "Internal";
      if (sg && tg) return "Cross";
      return "";
    }

    // Interactions table
    const interactionRows = interactions
      .map((ix, i) => {
        const src = esc(elById[ix.source]?.data?.label || ix.source);
        const tgt = esc(elById[ix.target]?.data?.label || ix.target);
        const bg = i % 2 === 0 ? "" : ' style="background:#f8f9fc"';
        const sc = interactionScope(ix);
        const scopeHtml =
          sc === "Internal"
            ? '<span class="scope-int">Internal</span>'
            : sc === "Cross"
              ? '<span class="scope-cross">Cross</span>'
              : "";
        if (ix.data?.isBidirectional) {
          return (
            `<tr${bg}><td>${src}</td><td class="dir">A&#8594;B</td><td>${tgt}</td><td>${scopeHtml}</td><td>${esc(strip(ix.data?.natureAtoB || ix.data?.natureOfInteraction || ""))}</td></tr>` +
            `<tr style="background:#f8f9fc"><td>${tgt}</td><td class="dir">B&#8594;A</td><td>${src}</td><td>${scopeHtml}</td><td>${esc(strip(ix.data?.natureBtoA || ""))}</td></tr>`
          );
        }
        return `<tr${bg}><td>${src}</td><td class="dir">&#8594;</td><td>${tgt}</td><td>${scopeHtml}</td><td>${esc(strip(ix.data?.natureOfInteraction || ix.data?.natureAtoB || ""))}</td></tr>`;
      })
      .join("");

    // Schema cards section
    const cardBlocks = cardNodes
      .map((card) => {
        const rows = (card.data?.rows || [])
          .map(
            (r) =>
              `<tr><td class="card-key">${esc(r.key)}</td><td class="card-val">${esc(r.value)}</td></tr>`,
          )
          .join("");
        return `<div class="card"><div class="card-title">${esc(card.data?.label || "Card")}</div><table class="card-table">${rows}</table></div>`;
      })
      .join("");

    const author = system.author || "";
    const org = system.organization || "";
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(system.title || "System Report")}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #16182c; margin: 0; padding: 0; }
  .page { max-width: 1000px; margin: 0 auto; padding: 40px 32px 64px; }
  /* Header */
  .report-header { background: #6366f1; color: #fff; padding: 24px 32px 20px; margin: -40px -32px 40px; }
  .report-header h1 { margin: 0 0 4px; font-size: 1.7rem; font-weight: 700; }
  .report-header .sub { font-size: 0.82rem; opacity: 0.82; }
  /* Stats */
  .stats { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
  .stat { background: #ebebfd; border-radius: 8px; padding: 12px 20px; text-align: center; min-width: 100px; }
  .stat-val { font-size: 1.6rem; font-weight: 700; color: #6366f1; line-height: 1; }
  .stat-label { font-size: 0.72rem; color: #6367a0; margin-top: 4px; }
  /* Section */
  h2 { font-size: 1rem; font-weight: 700; color: #6366f1; margin: 36px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #ebebfd; }
  /* Diagram */
  .diagram-wrap { border: 1px solid #dde0f0; border-radius: 8px; overflow: hidden; margin-bottom: 12px; background: #f5f7ff; }
  .diagram-wrap img { width: 100%; display: block; }
  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
  thead tr { background: #16182c; color: #fff; }
  thead th { padding: 7px 10px; text-align: left; font-weight: 600; }
  tbody td { padding: 6px 10px; border-bottom: 1px solid #e8eaf2; vertical-align: top; }
  /* Badges */
  .badge { display: inline-block; font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; font-weight: 600; text-transform: capitalize; }
  .badge-active     { background: #dcfce7; color: #166534; }
  .badge-planned    { background: #dbeafe; color: #1e3a8a; }
  .badge-critical   { background: #fee2e2; color: #991b1b; }
  .badge-deprecated { background: #f1f5f9; color: #64748b; }
  .dir { color: #6366f1; font-weight: 700; text-align: center; }
  /* Subsystems */
  .subsystem { border: 1px solid #dde0f0; border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
  .subsystem-name { background: #ebebfd; color: #5055a8; font-weight: 700; padding: 8px 14px; font-size: 0.9rem; }
  .subsystem ul { margin: 8px 0; padding: 0 14px 10px 28px; }
  .subsystem li { font-size: 0.83rem; padding: 2px 0; color: #16182c; }
  .empty { padding: 8px 14px; color: #9da0b8; font-size: 0.82rem; margin: 0; }
  /* Cards */
  .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .card { border: 1px solid #dde0f0; border-radius: 8px; overflow: hidden; }
  .card-title { background: #ebebfd; color: #5055a8; font-weight: 700; padding: 7px 12px; font-size: 0.85rem; }
  .card-table { font-size: 0.8rem; }
  .card-table td { padding: 4px 10px; border-bottom: 1px solid #f0f1f8; }
  .card-key { font-weight: 600; color: #16182c; width: 45%; }
  .card-val { color: #6367a0; }
  .scope-int  { display:inline-block; font-size:0.7rem; font-weight:600; padding:1px 5px; border-radius:3px; background:#ebebfd; color:#5055a8; }
  .scope-cross { display:inline-block; font-size:0.7rem; font-weight:600; padding:1px 5px; border-radius:3px; background:#fef3c7; color:#92400e; }
  a { color: #6366f1; }
  @media print { .page { padding: 0; } .report-header { margin: 0 0 32px; } }
</style>
</head>
<body>
<div class="page">
  <div class="report-header">
    <h1>${esc(system.title || "System Report")}</h1>
    <div class="sub">${org ? `${esc(org)} &nbsp;&middot;&nbsp; ` : ""}${author ? `${esc(author)} &nbsp;&middot;&nbsp; ` : ""}Generated ${esc(dateStr)}</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-val">${iconNodes.length}</div><div class="stat-label">Components</div></div>
    <div class="stat"><div class="stat-val">${interactions.length}</div><div class="stat-label">Interactions</div></div>
    <div class="stat"><div class="stat-val">${groupNodes.length}</div><div class="stat-label">Subsystems</div></div>
  </div>
  ${imgDataUrl ? `<h2>Diagram</h2><div class="diagram-wrap"><img src="${imgDataUrl}" alt="System diagram" /></div>` : ""}
  ${groupNodes.length > 0 ? `<h2>Subsystems (${groupNodes.length})</h2><div>${subsystemBlocks}</div>` : ""}
  ${
    iconNodes.length > 0
      ? `<h2>System Components (${iconNodes.length})</h2>
  <table><thead><tr><th>Component</th><th>Status</th><th>Tags</th><th>Purpose / Description</th><th>Connects To</th><th>Link</th></tr></thead>
  <tbody>${componentRows}</tbody></table>`
      : ""
  }
  ${cardNodes.length > 0 ? `<h2>Schema Cards (${cardNodes.length})</h2><div class="cards-grid">${cardBlocks}</div>` : ""}
  ${
    interactions.length > 0
      ? `<h2>Interactions (${interactions.length})</h2>
  <table><thead><tr><th>From</th><th style="width:50px">Dir</th><th>To</th><th style="width:90px">Scope</th><th>Nature of Interaction</th></tr></thead>
  <tbody>${interactionRows}</tbody></table>`
      : ""
  }
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(system.title || "system-report").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.html`;
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
