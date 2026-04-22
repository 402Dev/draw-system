import { memo, useState } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import { useStore } from "../store";
import { getIcon } from "../utils/icons";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

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

  const statusColor = data.status ? STATUS_COLORS[data.status] : null;
  const hasDesc = !!(data.purpose || data.description);

  return (
    <div
      className={`icon-node ${selected ? "icon-node--selected" : ""}`}
      style={nodeBg ? { background: nodeBg, borderColor: nodeBg } : undefined}>
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
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <Handle type="source" position={Position.Bottom} className="rf-handle" />
      <Handle type="target" position={Position.Left} className="rf-handle" />
      <Handle type="source" position={Position.Right} className="rf-handle" />

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

      <div className="icon-node__icon">
        {data.customImage ? (
          <img
            src={data.customImage}
            alt={data.label || "icon"}
            className="icon-node__custom-img"
          />
        ) : (
          <Icon size={36} strokeWidth={1.5} />
        )}
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
