import { memo, useState } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import { useStore } from "../store";

// Shared resize styles — large enough to grab reliably
const HANDLE_STYLE = {
  width: 16,
  height: 16,
  background: "#6366f1",
  border: "2.5px solid #fff",
  borderRadius: 3,
  zIndex: 10,
};
const LINE_STYLE = {
  borderWidth: 6, // 12 px total hit area, centered on the edge
  borderColor: "rgba(99,102,241,0.35)",
};

function GroupNode({ id, data, selected }) {
  const { actions } = useStore();
  const [editing, setEditing] = useState(false);

  const bg = data.color || "rgba(99,102,241,0.08)";
  const border = data.borderColor || "#6366f1";

  return (
    <div
      className={`group-node ${selected ? "group-node--selected" : ""}`}
      style={{ background: bg, borderColor: border }}>
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

      <div className="group-node__header">
        {editing ? (
          <input
            autoFocus
            className="group-node__label-input"
            value={data.label || ""}
            onChange={(e) =>
              actions.updateElement(id, { data: { label: e.target.value } })
            }
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") setEditing(false);
            }}
          />
        ) : (
          <span
            className="group-node__label"
            onDoubleClick={() => setEditing(true)}>
            {data.label || "Group"}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(GroupNode);
