import { memo, useState } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import { useStore } from "../store";

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

function CardNode({ id, data, selected }) {
  const { actions } = useStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const rows = data.rows || [];

  return (
    <div className={`card-node ${selected ? "card-node--selected" : ""}`}>
      <NodeResizer
        minWidth={120}
        minHeight={80}
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

      <div className="card-node__header">
        {editingTitle ? (
          <input
            autoFocus
            className="card-node__title-input"
            value={data.label || ""}
            onChange={(e) =>
              actions.updateElement(id, { data: { label: e.target.value } })
            }
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") setEditingTitle(false);
            }}
          />
        ) : (
          <span
            className="card-node__title"
            onDoubleClick={() => setEditingTitle(true)}>
            {data.label || "Schema"}
          </span>
        )}
      </div>

      <table className="card-node__table">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="card-node__row">
              <td className="card-node__key">{row.key}</td>
              <td className="card-node__val">{row.value}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} className="card-node__empty">
                Double-click to edit in panel
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default memo(CardNode);
