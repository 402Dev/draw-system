import { memo } from "react";
import {
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
} from "reactflow";

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
  const routingType = data?.routingType || "bezier";

  let edgePath, labelX, labelY;
  if (routingType === "straight") {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  } else if (routingType === "step") {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  const edgeColor = data?.color || "#6366f1";
  const edgeLabel = data?.edgeLabel;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: selected ? "#a78bfa" : edgeColor,
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />
      {edgeLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: "var(--bg2, #1e1e35)",
              border: "1px solid var(--border, #2e2e4a)",
              borderRadius: 4,
              padding: "1px 6px",
              fontSize: 10,
              color: "var(--text2, #9898b3)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
            className="nodrag nopan">
            {edgeLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(SmartEdge);
