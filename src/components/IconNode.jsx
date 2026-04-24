import { memo, useState } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import { useStore } from "../store";
import { getIcon } from "../utils/icons";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_FILL = "#1e1e38";
const DEFAULT_STROKE = "#2e2e50";
const ACCENT_STROKE = "#6366f1";
const SVG_SHAPES = new Set(["cylinder", "diamond", "hexagon", "parallelogram"]);

function NodeShapeBg({ shape, fill, stroke }) {
  const f = fill || DEFAULT_FILL;
  const s = stroke || DEFAULT_STROKE;
  const style = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    overflow: "visible",
  };
  if (shape === "cylinder")
    return (
      <svg viewBox="0 0 56 56" preserveAspectRatio="none" style={style}>
        <ellipse
          cx="28"
          cy="44"
          rx="26"
          ry="8"
          fill={f}
          stroke={s}
          strokeWidth="1.5"
        />
        <rect x="2" y="12" width="52" height="32" fill={f} stroke="none" />
        <line x1="2" y1="12" x2="2" y2="44" stroke={s} strokeWidth="1.5" />
        <line x1="54" y1="12" x2="54" y2="44" stroke={s} strokeWidth="1.5" />
        <ellipse
          cx="28"
          cy="12"
          rx="26"
          ry="8"
          fill={f}
          stroke={s}
          strokeWidth="1.5"
        />
      </svg>
    );
  if (shape === "diamond")
    return (
      <svg viewBox="0 0 56 56" preserveAspectRatio="none" style={style}>
        <polygon
          points="28,2 54,28 28,54 2,28"
          fill={f}
          stroke={s}
          strokeWidth="1.5"
        />
      </svg>
    );
  if (shape === "hexagon")
    return (
      <svg viewBox="0 0 56 56" preserveAspectRatio="none" style={style}>
        <polygon
          points="28,2 54,15 54,41 28,54 2,41 2,15"
          fill={f}
          stroke={s}
          strokeWidth="1.5"
        />
      </svg>
    );
  if (shape === "parallelogram")
    return (
      <svg viewBox="0 0 56 56" preserveAspectRatio="none" style={style}>
        <polygon
          points="14,2 54,2 42,54 2,54"
          fill={f}
          stroke={s}
          strokeWidth="1.5"
        />
      </svg>
    );
  return null;
}

const STATUS_COLORS = {
  planned: "#60a5fa",
  active: "#4ade80",
  deprecated: "#f87171",
  critical: "#fb923c",
};

const HANDLE_STYLE = {
  width: 16,
  height: 16,
  background: "#6366f1",
  border: "2.5px solid #fff",
  borderRadius: 3,
  zIndex: 10,
};
const LINE_STYLE = {
  borderWidth: 6,
  borderColor: "rgba(99,102,241,0.35)",
};

function IconNode({ id, data, selected }) {
  const { actions } = useStore();
  const Icon = getIcon(data.iconName || "Circle");
  const nodeBg = data.color || undefined;
  const [expanded, setExpanded] = useState(data.expanded || false);
  const shape = data.shape || "rect";
  const isSvgShape = SVG_SHAPES.has(shape);

  const statusColor = data.status ? STATUS_COLORS[data.status] : null;
  const hasDesc = !!(data.purpose || data.description);

  const svgFill = data.color || DEFAULT_FILL;
  const svgStroke = selected ? ACCENT_STROKE : DEFAULT_STROKE;
  const shapeClass = shape !== "rect" ? `icon-node__icon--shape-${shape}` : "";

  return (
    <div
      className={`icon-node ${selected ? "icon-node--selected" : ""}`}
      style={
        nodeBg && !isSvgShape
          ? { background: nodeBg, borderColor: nodeBg }
          : undefined
      }>
      <NodeResizer
        minWidth={80}
        minHeight={60}
        isVisible={!!data._resizing}
        handleStyle={HANDLE_STYLE}
        lineStyle={LINE_STYLE}
        onResizeEnd={(_e, { x, y, width, height }) => {
          actions.snapshot();
          actions.updateElement(id, { style: { width, height } });
          actions.moveElement(id, { x, y });
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="rf-handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="rf-handle"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="rf-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="rf-handle"
      />

      {/* Status badge */}
      {statusColor && (
        <span
          className="icon-node__status-badge"
          style={{ background: statusColor }}
          title={data.status}
        />
      )}

      {/* External link indicator */}
      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="icon-node__link-btn"
          onClick={(e) => e.stopPropagation()}
          title={data.url}>
          <ExternalLink size={10} />
        </a>
      )}

      <div className={`icon-node__icon${shapeClass ? ` ${shapeClass}` : ""}`}>
        {isSvgShape && (
          <NodeShapeBg shape={shape} fill={svgFill} stroke={svgStroke} />
        )}
        <span
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          {data.customImage ? (
            <img
              src={data.customImage}
              alt={data.label || "icon"}
              className="icon-node__custom-img"
            />
          ) : (
            <Icon size={isSvgShape ? 26 : 36} strokeWidth={1.5} />
          )}
        </span>
      </div>
      <div className="icon-node__label">{data.label || "Element"}</div>

      {/* Expandable description */}
      {hasDesc && (
        <button
          className="icon-node__expand-btn nodrag"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          title={expanded ? "Collapse" : "Expand"}>
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      )}
      {expanded && hasDesc && (
        <div className="icon-node__desc">
          {data.purpose || data.description}
        </div>
      )}
    </div>
  );
}

export default memo(IconNode);
