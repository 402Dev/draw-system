import { memo } from "react";
import {
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
  MarkerType,
} from "reactflow";

// Offset a path perpendicularly by `offset` pixels by shifting source/target
// along the normal of the edge direction. Used to separate bidir arrow pairs.
function getOffsetCoords(x1, y1, x2, y2, offset) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = (-dy / len) * offset;
  const ny = (dx / len) * offset;
  return { nx, ny };
}

function buildPath(routingType, sx, sy, sp, tx, ty, tp) {
  if (routingType === "straight") {
    return getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });
  } else if (routingType === "step") {
    return getSmoothStepPath({
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sp,
      targetX: tx,
      targetY: ty,
      targetPosition: tp,
    });
  } else {
    return getBezierPath({
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sp,
      targetX: tx,
      targetY: ty,
      targetPosition: tp,
    });
  }
}

const ARROW_MARKER = (id, color) =>
  `url(#arrow-${id}-${color.replace("#", "")})`;

function EdgeLabel({ x, y, text, flip }) {
  return (
    <div
      style={{
        position: "absolute",
        transform: `translate(-50%, ${flip ? "8px" : "-100%"}) translate(${x}px,${y}px)`,
        background: "var(--bg2, #1e1e35)",
        border: "1px solid var(--border, #2e2e4a)",
        borderRadius: 4,
        padding: "1px 6px",
        fontSize: 10,
        color: "var(--text2, #9898b3)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        marginTop: flip ? 2 : -2,
      }}
      className="nodrag nopan">
      {text}
    </div>
  );
}

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
}) {
  const routingType = data?.routingType || "bezier";
  const edgeColor = selected ? "#a78bfa" : data?.color || "#6366f1";
  const strokeWidth = selected ? 2.5 : 1.5;
  const isBidir = !!data?.isBidirectional;

  if (isBidir) {
    // Two offset parallel arrows: A→B on one side, B→A on the other
    const OFFSET = 5;
    const { nx, ny } = getOffsetCoords(
      sourceX,
      sourceY,
      targetX,
      targetY,
      OFFSET,
    );

    // A→B path (offset one way)
    const [pathAB, lxAB, lyAB] = buildPath(
      routingType,
      sourceX + nx,
      sourceY + ny,
      sourcePosition,
      targetX + nx,
      targetY + ny,
      targetPosition,
    );
    // B→A path (offset the other way, reversed source/target)
    const [pathBA, lxBA, lyBA] = buildPath(
      routingType,
      targetX - nx,
      targetY - ny,
      targetPosition,
      sourceX - nx,
      sourceY - ny,
      sourcePosition,
    );

    const labelAtoB = data?.labelAtoB;
    const labelBtoA = data?.labelBtoA;

    // Inline SVG arrow markers so we can color them correctly
    const markerId = `arrow-${id}`;
    const markerColor = edgeColor;

    return (
      <>
        <defs>
          <marker
            id={`${markerId}-ab`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={markerColor} />
          </marker>
          <marker
            id={`${markerId}-ba`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={markerColor} />
          </marker>
        </defs>

        {/* A→B arrow */}
        <path
          d={pathAB}
          fill="none"
          stroke={edgeColor}
          strokeWidth={strokeWidth}
          markerEnd={`url(#${markerId}-ab)`}
        />
        {/* B→A arrow */}
        <path
          d={pathBA}
          fill="none"
          stroke={edgeColor}
          strokeWidth={strokeWidth}
          markerEnd={`url(#${markerId}-ba)`}
        />

        <EdgeLabelRenderer>
          {labelAtoB && (
            <EdgeLabel x={lxAB} y={lyAB} text={labelAtoB} flip={false} />
          )}
          {labelBtoA && (
            <EdgeLabel x={lxBA} y={lyBA} text={labelBtoA} flip={true} />
          )}
        </EdgeLabelRenderer>
      </>
    );
  }

  // ── One-way edge ──────────────────────────────────────────────────
  const [edgePath, labelX, labelY] = buildPath(
    routingType,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  );

  const natureLabel = data?.edgeLabel;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: edgeColor, strokeWidth }}
      />
      {natureLabel && (
        <EdgeLabelRenderer>
          <EdgeLabel x={labelX} y={labelY} text={natureLabel} flip={false} />
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(SmartEdge);
