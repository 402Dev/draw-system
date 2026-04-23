import { memo, useState, useCallback } from "react";
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

function StickyNote({ id, data, selected }) {
  const { actions } = useStore();
  const [editing, setEditing] = useState(false);

  const handleTextChange = useCallback(
    (e) => {
      actions.updateElement(id, { data: { text: e.target.value } });
    },
    [id, actions],
  );

  const noteColor = data.color || "#fef08a";

  return (
    <div
      className={`sticky-note ${selected ? "sticky-note--selected" : ""}`}
      style={{ background: noteColor }}
      onDoubleClick={() => setEditing(true)}>
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
      {editing ? (
        <textarea
          className="sticky-note__textarea"
          value={data.text || ""}
          autoFocus
          onChange={handleTextChange}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <div className="sticky-note__text">
          {data.text || (
            <span className="sticky-note__placeholder">
              Double-click to edit…
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(StickyNote);
