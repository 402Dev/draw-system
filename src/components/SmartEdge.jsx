import { memo } from "react";
import { getBezierPath, BaseEdge } from "reactflow";

function SmartEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
  markerStart,
}) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      markerStart={markerStart}
      style={{
        stroke: selected ? "#a78bfa" : "#6366f1",
        strokeWidth: selected ? 2.5 : 1.5,
      }}
    />
  );
}

export default memo(SmartEdge);
