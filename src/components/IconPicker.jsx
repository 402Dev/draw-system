import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ICON_NAMES, getIcon } from "../utils/icons";
import { X, Upload, Globe, Search } from "lucide-react";

export default function IconPicker({ current, onSelect, onClose, onUpload }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("lucide"); // "lucide" | "online"
  const [onlineIcons, setOnlineIcons] = useState([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const fileRef = useRef(null);

  const filtered =
    query && tab === "lucide"
      ? ICON_NAMES.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
      : ICON_NAMES;

  useEffect(() => {
    if (tab === "online" && query.length >= 2) {
      setLoadingOnline(true);
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=150`,
          );
          const data = await res.json();
          setOnlineIcons(data.icons || []);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingOnline(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (tab === "online" && query.length < 2) {
      setOnlineIcons([]);
    }
  }, [query, tab]);

  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpload(ev.target.result);
      onClose();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleOnlineSelect(iconFqn) {
    if (!onUpload) return;
    try {
      const [prefix, name] = iconFqn.split(":");
      const res = await fetch(
        `https://api.iconify.design/${prefix}/${name}.svg`,
      );
      let svgText = await res.text();
      // Replace currentColor / black with our light theme text so it looks correct on dark bg
      svgText = svgText
        .replace(/"currentColor"/g, '"#c7c7d4"')
        .replace(/"#000000"/g, '"#c7c7d4"')
        .replace(/"#000"/g, '"#c7c7d4"');
      const base64 = btoa(unescape(encodeURIComponent(svgText)));
      onUpload(`data:image/svg+xml;base64,${base64}`);
    } catch (e) {
      console.error("Failed to load online icon", e);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose} onKeyDown={handleKey}>
      <div
        className="icon-picker"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Icon picker">
        <div className="icon-picker__header">
          <span>Choose an Icon</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {onUpload && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <button
                  className="upload-img-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileRef.current?.click();
                  }}
                  title="Upload your own image">
                  <Upload size={14} />
                  Upload
                </button>
              </>
            )}
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="icon-picker__tabs" style={{ marginTop: 12 }}>
          <button
            className={`icon-picker__tab ${tab === "lucide" ? "icon-picker__tab--active" : ""}`}
            onClick={() => setTab("lucide")}>
            Local Library
          </button>
          {onUpload && (
            <button
              className={`icon-picker__tab ${tab === "online" ? "icon-picker__tab--active" : ""}`}
              onClick={() => setTab("online")}>
              <Globe
                size={14}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 4,
                  marginBottom: 2,
                }}
              />
              Online Search
            </button>
          )}
        </div>

        <input
          autoFocus
          className="icon-picker__search"
          placeholder={
            tab === "lucide"
              ? "Search local icons…"
              : "Search online free icons (Iconify API)…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />

        <div className="icon-picker__grid">
          {tab === "lucide" &&
            filtered.slice(0, 300).map((name) => {
              const Icon = getIcon(name);
              return (
                <button
                  key={name}
                  className={`icon-picker__item ${current === name ? "icon-picker__item--active" : ""}`}
                  title={name}
                  onClick={() => onSelect(name)}>
                  <Icon size={44} strokeWidth={1.5} />
                  <span>{name}</span>
                </button>
              );
            })}

          {tab === "online" && loadingOnline && (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: 20,
                color: "var(--text2)",
              }}>
              Searching free public icons...
            </div>
          )}

          {tab === "online" &&
            !loadingOnline &&
            onlineIcons.length === 0 &&
            query.length >= 2 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: 20,
                  color: "var(--text2)",
                }}>
                No open source icons found for "{query}".
              </div>
            )}

          {tab === "online" && !loadingOnline && query.length < 2 && (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: 20,
                color: "var(--text2)",
              }}>
              Type at least 2 characters to search the free Iconify API...
            </div>
          )}

          {tab === "online" &&
            !loadingOnline &&
            onlineIcons.map((iconFqn) => {
              const [prefix, name] = iconFqn.split(":");
              return (
                <button
                  key={iconFqn}
                  className={"icon-picker__item"}
                  title={iconFqn}
                  onClick={() => handleOnlineSelect(iconFqn)}>
                  <img
                    src={`https://api.iconify.design/${prefix}/${name}.svg?color=%23c7c7d4&width=48&height=48`}
                    alt={iconFqn}
                    style={{ width: 48, height: 48, objectFit: "contain" }}
                  />
                  <span>{name}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
