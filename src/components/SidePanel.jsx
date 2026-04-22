import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { X, ArrowRight, ArrowLeftRight, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { getIcon } from "../utils/icons";
import IconPicker from "./IconPicker";

export default function SidePanel({ selected, onClose }) {
  const { state, actions } = useStore();
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [markdownPreview, setMarkdownPreview] = useState(false);

  if (!selected) return null;

  const isNode = selected.type === "node";
  const isEdge = selected.type === "edge";

  const item = isNode
    ? state.elements.find((e) => e.id === selected.id)
    : state.interactions.find((i) => i.id === selected.id);

  if (!item) return null;

  // Connected interactions for nodes
  const connectedFrom = isNode
    ? state.interactions.filter((i) => i.target === item.id)
    : [];
  const connectedTo = isNode
    ? state.interactions.filter((i) => i.source === item.id)
    : [];

  const elementById = Object.fromEntries(state.elements.map((e) => [e.id, e]));

  function handleLabelChange(e) {
    actions.updateElement(item.id, { data: { label: e.target.value } });
  }

  function handleNatureChange(e) {
    actions.updateInteraction(item.id, {
      data: { natureOfInteraction: e.target.value },
    });
  }

  function handleBidirectionalToggle() {
    actions.updateInteraction(item.id, {
      data: { isBidirectional: !item.data?.isBidirectional },
    });
  }

  function handleIconSelect(iconName) {
    actions.updateElement(item.id, {
      data: { iconName, customImage: undefined },
    });
    setShowIconPicker(false);
  }

  function handleImageUpload(dataUrl) {
    actions.updateElement(item.id, { data: { customImage: dataUrl } });
  }

  function handleClearImage() {
    actions.updateElement(item.id, { data: { customImage: undefined } });
  }

  function handleDelete() {
    if (isNode) actions.deleteElement(item.id);
    else actions.deleteInteraction(item.id);
    onClose();
  }

  const Icon = isNode ? getIcon(item.data?.iconName) : null;
  const srcLabel = isEdge
    ? elementById[item.source]?.data?.label || item.source
    : null;
  const tgtLabel = isEdge
    ? elementById[item.target]?.data?.label || item.target
    : null;

  return (
    <>
      <div className="side-panel">
        <div className="side-panel__header">
          <span className="side-panel__title">
            {isNode ? (
              Icon ? (
                <Icon size={16} />
              ) : null
            ) : item.data?.isBidirectional ? (
              <ArrowLeftRight size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
            &nbsp;
            {isNode
              ? item.data?.label || "Element"
              : `${srcLabel} → ${tgtLabel}`}
          </span>
          <div className="side-panel__header-actions">
            <button
              className="icon-btn danger"
              onClick={handleDelete}
              title="Delete">
              <Trash2 size={15} />
            </button>
            <button className="icon-btn" onClick={onClose} title="Close">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="side-panel__body">
          {isNode && (
            <>
              <label className="field-label">Label</label>
              <input
                className="field-input"
                value={item.data?.label || ""}
                onChange={handleLabelChange}
                placeholder="Element label"
              />

              <label className="field-label">Icon</label>
              {item.data?.customImage ? (
                <div className="icon-img-row">
                  <img
                    src={item.data.customImage}
                    alt="icon"
                    className="icon-img-thumb"
                  />
                  <button
                    className="icon-select-btn"
                    onClick={() => setShowIconPicker(true)}>
                    Replace
                  </button>
                  <button
                    className="icon-select-btn"
                    onClick={handleClearImage}>
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  className="icon-select-btn"
                  onClick={() => setShowIconPicker(true)}>
                  {Icon && <Icon size={20} strokeWidth={1.5} />}
                  <span>{item.data?.iconName || "Choose icon"}</span>
                </button>
              )}

              <div className="field-label-row">
                <label className="field-label">Purpose</label>
                <button
                  className="toggle-btn"
                  onClick={() => setMarkdownPreview((p) => !p)}>
                  {markdownPreview ? "Edit" : "Preview"}
                </button>
              </div>
              {markdownPreview ? (
                <div className="markdown-preview">
                  <ReactMarkdown>
                    {item.data?.purpose ||
                      item.data?.description ||
                      "_No purpose defined_"}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  className="field-textarea"
                  value={item.data?.purpose || item.data?.description || ""}
                  onChange={(e) =>
                    actions.updateElement(item.id, {
                      data: { purpose: e.target.value },
                    })
                  }
                  placeholder="Define element purpose/subsystem..."
                  rows={6}
                />
              )}

              {(connectedTo.length > 0 || connectedFrom.length > 0) && (
                <div className="connections-section">
                  {connectedTo.length > 0 && (
                    <>
                      <label className="field-label">Connected To</label>
                      <ul className="connections-list">
                        {connectedTo.map((ix) => (
                          <li key={ix.id}>
                            {ix.data?.isBidirectional ? "⇄" : "→"}{" "}
                            {elementById[ix.target]?.data?.label || ix.target}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {connectedFrom.length > 0 && (
                    <>
                      <label className="field-label">Connected From</label>
                      <ul className="connections-list">
                        {connectedFrom.map((ix) => (
                          <li key={ix.id}>
                            {ix.data?.isBidirectional ? "⇄" : "←"}{" "}
                            {elementById[ix.source]?.data?.label || ix.source}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {isEdge && (
            <>
              <label className="field-label">Directionality</label>
              <div className="toggle-row">
                <span>
                  {item.data?.isBidirectional ? "Two-way" : "One-way"}
                </span>
                <button
                  className={`toggle-switch ${item.data?.isBidirectional ? "toggle-switch--on" : ""}`}
                  onClick={handleBidirectionalToggle}
                  role="switch"
                  aria-checked={item.data?.isBidirectional}>
                  <span className="toggle-switch__thumb" />
                </button>
              </div>

              <div className="field-label-row">
                <label className="field-label">Nature of Interaction</label>
                <button
                  className="toggle-btn"
                  onClick={() => setMarkdownPreview((p) => !p)}>
                  {markdownPreview ? "Edit" : "Preview"}
                </button>
              </div>
              {markdownPreview ? (
                <div className="markdown-preview">
                  <ReactMarkdown>
                    {item.data?.natureOfInteraction || "_No description_"}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  className="field-textarea"
                  value={item.data?.natureOfInteraction || ""}
                  onChange={handleNatureChange}
                  placeholder="Markdown supported…"
                  rows={6}
                />
              )}
            </>
          )}
        </div>
      </div>

      {showIconPicker && (
        <IconPicker
          current={item.data?.iconName}
          onSelect={handleIconSelect}
          onUpload={handleImageUpload}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </>
  );
}
