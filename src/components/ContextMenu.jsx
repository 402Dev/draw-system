import { useEffect, useRef } from "react";

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ position: "fixed", left: x, top: y, zIndex: 9999 }}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="context-menu__sep" />
        ) : (
          <button
            key={i}
            className={`context-menu__item${item.danger ? " context-menu__item--danger" : ""}`}
            onClick={() => {
              item.onClick();
              onClose();
            }}>
            {item.icon && (
              <span className="context-menu__icon">{item.icon}</span>
            )}
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
