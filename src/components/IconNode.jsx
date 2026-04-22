import { memo } from "react";
import { Handle, Position } from "reactflow";
import { getIcon } from "../utils/icons";

function IconNode({ data, selected }) {
  const Icon = getIcon(data.iconName || "Circle");

  return (
    <div className={`icon-node ${selected ? "icon-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <Handle type="source" position={Position.Bottom} className="rf-handle" />
      <Handle type="target" position={Position.Left} className="rf-handle" />
      <Handle type="source" position={Position.Right} className="rf-handle" />
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
    </div>
  );
}

export default memo(IconNode);
