import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { X, ArrowRight, ArrowLeftRight, Trash2, Plus } from "lucide-react";
import { useStore } from "../store";
import { getIcon } from "../utils/icons";
import IconPicker from "./IconPicker";

const STATUS_OPTIONS = ["", "planned", "active", "deprecated", "critical"];

export default function SidePanel({ selected, onClose }) {
  const { state, actions } = useStore();
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [markdownPreview, setMarkdownPreview] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrVal, setNewAttrVal] = useState("");
  const [newCardKey, setNewCardKey] = useState("");
  const [newCardVal, setNewCardVal] = useState("");

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

  function handleNatureAtoBChange(e) {
    actions.updateInteraction(item.id, {
      data: { natureAtoB: e.target.value },
    });
  }
  function handleNatureBtoAChange(e) {
    actions.updateInteraction(item.id, {
      data: { natureBtoA: e.target.value },
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

              <label className="field-label">Tags</label>
              <div className="tags-row">
                {(typeof item.data?.tags === "string"
                  ? item.data.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                  : item.data?.tags || []
                ).map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                    <button
                      className="tag__remove"
                      onClick={() => {
                        const arr = (
                          typeof item.data?.tags === "string"
                            ? item.data.tags
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean)
                            : item.data?.tags || []
                        ).filter((t) => t !== tag);
                        actions.updateElement(item.id, {
                          data: { tags: arr.join(",") },
                        });
                      }}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (
                      (e.key === "Enter" || e.key === ",") &&
                      tagInput.trim()
                    ) {
                      e.preventDefault();
                      const newTag = tagInput.trim();
                      const existing =
                        typeof item.data?.tags === "string"
                          ? item.data.tags
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean)
                          : item.data?.tags || [];
                      if (!existing.includes(newTag)) {
                        actions.updateElement(item.id, {
                          data: { tags: [...existing, newTag].join(",") },
                        });
                      }
                      setTagInput("");
                    }
                  }}
                  placeholder="Add tag, press Enter…"
                />
              </div>

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

              {/* Shape picker — only for iconNode */}
              {item.type === "iconNode" && (
                <>
                  <label className="field-label">Shape</label>
                  <div className="shape-picker">
                    {[
                      {
                        id: "rect",
                        label: "Box",
                        preview: (
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        ),
                      },
                      {
                        id: "rounded",
                        label: "Rounded",
                        preview: (
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        ),
                      },
                      {
                        id: "circle",
                        label: "Circle",
                        preview: (
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        ),
                      },
                      {
                        id: "cylinder",
                        label: "Cylinder",
                        preview: (
                          <>
                            <ellipse
                              cx="12"
                              cy="17"
                              rx="9"
                              ry="3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="3"
                              y1="7"
                              x2="3"
                              y2="17"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="21"
                              y1="7"
                              x2="21"
                              y2="17"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <ellipse
                              cx="12"
                              cy="7"
                              rx="9"
                              ry="3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </>
                        ),
                      },
                      {
                        id: "diamond",
                        label: "Diamond",
                        preview: (
                          <polygon
                            points="12,2 22,12 12,22 2,12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        ),
                      },
                      {
                        id: "hexagon",
                        label: "Hexagon",
                        preview: (
                          <polygon
                            points="12,2 21,7 21,17 12,22 3,17 3,7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        ),
                      },
                      {
                        id: "parallelogram",
                        label: "I/O",
                        preview: (
                          <polygon
                            points="7,3 21,3 17,21 3,21"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        ),
                      },
                    ].map((s) => (
                      <button
                        key={s.id}
                        className={`shape-swatch${(item.data?.shape || "rect") === s.id ? " shape-swatch--active" : ""}`}
                        title={s.label}
                        onClick={() =>
                          actions.updateElement(item.id, {
                            data: { shape: s.id },
                          })
                        }>
                        <svg
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg">
                          {s.preview}
                        </svg>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {item.type === "groupNode" ? (
                /* ── Group box: fill + border color ─── */
                <>
                  <label className="field-label">Fill Color</label>
                  <div className="color-row">
                    <input
                      type="color"
                      className="color-input"
                      value={
                        item.data?.color
                          ? item.data.color.startsWith("rgba")
                            ? "#6366f1"
                            : item.data.color
                          : "#6366f1"
                      }
                      onChange={(e) =>
                        actions.updateElement(item.id, {
                          data: { color: e.target.value + "33" },
                        })
                      }
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      className="opacity-slider"
                      title="Fill opacity"
                      value={Math.round(
                        item.data?.color?.startsWith("rgba")
                          ? parseFloat(item.data.color.split(",")[3]) * 100
                          : item.data?.color?.length === 9
                            ? parseInt(item.data.color.slice(7), 16) / 2.55
                            : 20,
                      )}
                      onChange={(e) => {
                        const hex =
                          item.data?.color &&
                          !item.data.color.startsWith("rgba")
                            ? item.data.color.slice(0, 7)
                            : "#6366f1";
                        const alpha = Math.round(
                          (parseInt(e.target.value) / 100) * 255,
                        )
                          .toString(16)
                          .padStart(2, "0");
                        actions.updateElement(item.id, {
                          data: { color: hex + alpha },
                        });
                      }}
                    />
                  </div>
                  <label className="field-label">Border Color</label>
                  <div className="color-row">
                    <input
                      type="color"
                      className="color-input"
                      value={item.data?.borderColor || "#6366f1"}
                      onChange={(e) =>
                        actions.updateElement(item.id, {
                          data: { borderColor: e.target.value },
                        })
                      }
                    />
                    <button
                      className="toggle-btn"
                      onClick={() =>
                        actions.updateElement(item.id, {
                          data: { borderColor: "#6366f1" },
                        })
                      }>
                      Reset
                    </button>
                  </div>
                </>
              ) : (
                /* ── All other nodes: single color ─── */
                <>
                  <label className="field-label">Node Color</label>
                  <div className="color-row">
                    <input
                      type="color"
                      className="color-input"
                      value={item.data?.color || "#252540"}
                      onChange={(e) =>
                        actions.updateElement(item.id, {
                          data: { color: e.target.value },
                        })
                      }
                    />
                    {item.data?.color && (
                      <button
                        className="toggle-btn"
                        onClick={() =>
                          actions.updateElement(item.id, {
                            data: { color: undefined },
                          })
                        }>
                        Reset
                      </button>
                    )}
                  </div>
                </>
              )}

              <label className="field-label">Dimensions (W × H)</label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "16px",
                  alignItems: "center",
                }}>
                <input
                  type="number"
                  className="field-input"
                  placeholder="Width"
                  value={item.style?.width || ""}
                  onChange={(e) => {
                    const w = e.target.value
                      ? Number(e.target.value)
                      : undefined;
                    actions.updateElement(item.id, {
                      style: { ...item.style, width: w },
                    });
                  }}
                />
                <span style={{ color: "#a0a4c0" }}>×</span>
                <input
                  type="number"
                  className="field-input"
                  placeholder="Height"
                  value={item.style?.height || ""}
                  onChange={(e) => {
                    const h = e.target.value
                      ? Number(e.target.value)
                      : undefined;
                    actions.updateElement(item.id, {
                      style: { ...item.style, height: h },
                    });
                  }}
                />
              </div>

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

              {/* Status Badge */}
              <label className="field-label">Status</label>
              <select
                className="field-input"
                value={item.data?.status || ""}
                onChange={(e) =>
                  actions.updateElement(item.id, {
                    data: { status: e.target.value },
                  })
                }>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s ? s.charAt(0).toUpperCase() + s.slice(1) : "— none —"}
                  </option>
                ))}
              </select>

              {/* External URL */}
              <label className="field-label">External Link (URL)</label>
              <input
                className="field-input"
                type="url"
                value={item.data?.url || ""}
                onChange={(e) =>
                  actions.updateElement(item.id, {
                    data: { url: e.target.value },
                  })
                }
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="https://…"
              />

              {/* Custom Key-Value Attributes */}
              <label className="field-label">Custom Attributes</label>
              {(item.data?.attributes || []).map((attr, i) => (
                <div key={i} className="attr-row">
                  <input
                    className="field-input attr-key"
                    value={attr.key}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const attrs = [...(item.data.attributes || [])];
                      attrs[i] = { ...attrs[i], key: e.target.value };
                      actions.updateElement(item.id, {
                        data: { attributes: attrs },
                      });
                    }}
                    placeholder="Key"
                  />
                  <input
                    className="field-input attr-val"
                    value={attr.value}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const attrs = [...(item.data.attributes || [])];
                      attrs[i] = { ...attrs[i], value: e.target.value };
                      actions.updateElement(item.id, {
                        data: { attributes: attrs },
                      });
                    }}
                    placeholder="Value"
                  />
                  <button
                    className="icon-btn danger"
                    onClick={() => {
                      const attrs = (item.data.attributes || []).filter(
                        (_, idx) => idx !== i,
                      );
                      actions.updateElement(item.id, {
                        data: { attributes: attrs },
                      });
                    }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="attr-row">
                <input
                  className="field-input attr-key"
                  value={newAttrKey}
                  onKeyDown={(e) => e.stopPropagation()}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  placeholder="New key"
                />
                <input
                  className="field-input attr-val"
                  value={newAttrVal}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" && newAttrKey.trim()) {
                      const attrs = [
                        ...(item.data?.attributes || []),
                        { key: newAttrKey.trim(), value: newAttrVal },
                      ];
                      actions.updateElement(item.id, {
                        data: { attributes: attrs },
                      });
                      setNewAttrKey("");
                      setNewAttrVal("");
                    }
                  }}
                  onChange={(e) => setNewAttrVal(e.target.value)}
                  placeholder="Value"
                />
                <button
                  className="icon-btn"
                  disabled={!newAttrKey.trim()}
                  onClick={() => {
                    if (!newAttrKey.trim()) return;
                    const attrs = [
                      ...(item.data?.attributes || []),
                      { key: newAttrKey.trim(), value: newAttrVal },
                    ];
                    actions.updateElement(item.id, {
                      data: { attributes: attrs },
                    });
                    setNewAttrKey("");
                    setNewAttrVal("");
                  }}>
                  <Plus size={13} />
                </button>
              </div>

              {/* Card Node rows editing */}
              {item.type === "cardNode" && (
                <>
                  <label className="field-label">Schema Rows</label>
                  {(item.data?.rows || []).map((row, i) => (
                    <div key={i} className="attr-row">
                      <input
                        className="field-input attr-key"
                        value={row.key}
                        onKeyDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const rows = [...(item.data.rows || [])];
                          rows[i] = { ...rows[i], key: e.target.value };
                          actions.updateElement(item.id, { data: { rows } });
                        }}
                        placeholder="Field"
                      />
                      <input
                        className="field-input attr-val"
                        value={row.value}
                        onKeyDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const rows = [...(item.data.rows || [])];
                          rows[i] = { ...rows[i], value: e.target.value };
                          actions.updateElement(item.id, { data: { rows } });
                        }}
                        placeholder="Type / value"
                      />
                      <button
                        className="icon-btn danger"
                        onClick={() => {
                          const rows = (item.data.rows || []).filter(
                            (_, idx) => idx !== i,
                          );
                          actions.updateElement(item.id, { data: { rows } });
                        }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="attr-row">
                    <input
                      className="field-input attr-key"
                      value={newCardKey}
                      onKeyDown={(e) => e.stopPropagation()}
                      onChange={(e) => setNewCardKey(e.target.value)}
                      placeholder="Field name"
                    />
                    <input
                      className="field-input attr-val"
                      value={newCardVal}
                      onKeyDown={(e) => e.stopPropagation()}
                      onChange={(e) => setNewCardVal(e.target.value)}
                      placeholder="Type / value"
                    />
                    <button
                      className="icon-btn"
                      disabled={!newCardKey.trim()}
                      onClick={() => {
                        if (!newCardKey.trim()) return;
                        const rows = [
                          ...(item.data?.rows || []),
                          { key: newCardKey.trim(), value: newCardVal },
                        ];
                        actions.updateElement(item.id, { data: { rows } });
                        setNewCardKey("");
                        setNewCardVal("");
                      }}>
                      <Plus size={13} />
                    </button>
                  </div>
                </>
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

              <label className="field-label">Routing</label>
              <div className="segment-row">
                {["bezier", "straight", "step"].map((rt) => (
                  <button
                    key={rt}
                    className={`segment-btn${(item.data?.routingType || "bezier") === rt ? " segment-btn--active" : ""}`}
                    onClick={() =>
                      actions.updateInteraction(item.id, {
                        data: { routingType: rt },
                      })
                    }>
                    {rt.charAt(0).toUpperCase() + rt.slice(1)}
                  </button>
                ))}
              </div>

              <label className="field-label">Edge Color</label>
              <div className="color-row">
                <input
                  type="color"
                  className="color-input"
                  value={item.data?.color || "#6366f1"}
                  onChange={(e) =>
                    actions.updateInteraction(item.id, {
                      data: { color: e.target.value },
                    })
                  }
                />
                {item.data?.color && (
                  <button
                    className="toggle-btn"
                    onClick={() =>
                      actions.updateInteraction(item.id, {
                        data: { color: undefined },
                      })
                    }>
                    Reset
                  </button>
                )}
              </div>

              {item.data?.isBidirectional ? (
                <>
                  <label className="field-label">Canvas Label (A → B)</label>
                  <input
                    className="field-input"
                    value={item.data?.labelAtoB || ""}
                    onChange={(e) =>
                      actions.updateInteraction(item.id, {
                        data: { labelAtoB: e.target.value },
                      })
                    }
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Short label shown on arrow…"
                  />
                  <div className="field-label-row">
                    <label className="field-label">Description (A → B)</label>
                    <button
                      className="toggle-btn"
                      onClick={() => setMarkdownPreview((p) => !p)}>
                      {markdownPreview ? "Edit" : "Preview"}
                    </button>
                  </div>
                  {markdownPreview ? (
                    <div className="markdown-preview">
                      <ReactMarkdown>
                        {item.data?.natureAtoB || "_No description_"}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      className="field-textarea"
                      value={item.data?.natureAtoB || ""}
                      onChange={handleNatureAtoBChange}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Describe A → B…"
                      rows={3}
                    />
                  )}

                  <label className="field-label">Canvas Label (B → A)</label>
                  <input
                    className="field-input"
                    value={item.data?.labelBtoA || ""}
                    onChange={(e) =>
                      actions.updateInteraction(item.id, {
                        data: { labelBtoA: e.target.value },
                      })
                    }
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Short label shown on arrow…"
                  />
                  <div className="field-label-row">
                    <label className="field-label">Description (B → A)</label>
                  </div>
                  {markdownPreview ? (
                    <div className="markdown-preview">
                      <ReactMarkdown>
                        {item.data?.natureBtoA || "_No description_"}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      className="field-textarea"
                      value={item.data?.natureBtoA || ""}
                      onChange={handleNatureBtoAChange}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Describe B → A…"
                      rows={3}
                    />
                  )}
                </>
              ) : (
                <>
                  <label className="field-label">Canvas Label</label>
                  <input
                    className="field-input"
                    value={item.data?.edgeLabel || ""}
                    onChange={(e) =>
                      actions.updateInteraction(item.id, {
                        data: { edgeLabel: e.target.value },
                      })
                    }
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Short label shown on arrow…"
                  />
                  <div className="field-label-row">
                    <label className="field-label">Description</label>
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
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Full description (Markdown supported)…"
                      rows={5}
                    />
                  )}
                </>
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
