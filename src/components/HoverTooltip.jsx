import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function HoverTooltip({ item, type, position }) {
  if (!item || !position) return null;

  const label =
    type === "edge"
      ? (() => {
          const src = item._sourceLabel || item.source;
          const tgt = item._targetLabel || item.target;
          return `${src} → ${tgt}`;
        })()
      : item.data?.label;

  const body =
    type === "edge"
      ? item.data?.natureOfInteraction
      : item.data?.purpose || item.data?.description;

  const truncated = (body || "").length > 200 ? body.slice(0, 200) + "…" : body;

  const style = {
    left: Math.min(position.x + 12, window.innerWidth - 280),
    top: Math.min(position.y + 12, window.innerHeight - 150),
  };

  return (
    <div className="hover-tooltip" style={style}>
      <div className="hover-tooltip__title">{label}</div>
      {truncated && (
        <div className="hover-tooltip__body">
          <ReactMarkdown>{truncated}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
