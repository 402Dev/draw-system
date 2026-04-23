import { useState } from "react";
import { useStore } from "../store";
import { ChevronDown, Plus, Trash2, FolderOpen, Folder } from "lucide-react";
import TemplateModal from "./TemplateModal";

export default function WorkspaceSwitcher() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingFolderFor, setEditingFolderFor] = useState(null);
  const [folderInput, setFolderInput] = useState("");

  const current = state.system;
  const all = state.allSystems || [];

  // Group by folder
  const folders = {};
  all.forEach((sys) => {
    const f = sys.folder || "";
    if (!folders[f]) folders[f] = [];
    folders[f].push(sys);
  });
  const folderKeys = Object.keys(folders).sort((a, b) =>
    a === "" ? -1 : b === "" ? 1 : a.localeCompare(b),
  );

  function renderSystem(sys) {
    return (
      <div
        key={sys.id}
        className={`workspace-switcher__item ${sys.id === current.id ? "workspace-switcher__item--active" : ""}`}>
        <span
          className="workspace-switcher__item-label"
          onClick={() => {
            actions.switchWorkspace(sys.id);
            setOpen(false);
          }}>
          {sys.title}
        </span>
        <button
          className="icon-btn"
          title="Set folder"
          onClick={(e) => {
            e.stopPropagation();
            setEditingFolderFor(sys.id);
            setFolderInput(sys.folder || "");
          }}>
          <Folder size={11} />
        </button>
        {all.length > 1 && sys.id !== current.id && (
          <button
            className="icon-btn danger"
            title="Delete workspace"
            onClick={() => actions.deleteWorkspace(sys.id)}>
            <Trash2 size={12} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="workspace-switcher">
        <button
          className="workspace-switcher__trigger"
          onClick={() => setOpen((v) => !v)}
          title="Switch workspace">
          <span className="workspace-switcher__label">{current.title}</span>
          <ChevronDown size={14} />
        </button>

        {open && (
          <div className="workspace-switcher__menu">
            {folderKeys.map((folder) => (
              <div key={folder}>
                {folder && (
                  <div className="workspace-switcher__folder-header">
                    <FolderOpen size={11} />
                    {folder}
                  </div>
                )}
                {folders[folder].map((sys) => (
                  <div key={sys.id}>
                    {renderSystem(sys)}
                    {editingFolderFor === sys.id && (
                      <div className="workspace-switcher__folder-edit">
                        <input
                          autoFocus
                          className="field-input"
                          value={folderInput}
                          onChange={(e) => setFolderInput(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                              actions.setWorkspaceFolder(
                                sys.id,
                                folderInput.trim(),
                              );
                              setEditingFolderFor(null);
                            }
                            if (e.key === "Escape") setEditingFolderFor(null);
                          }}
                          placeholder="Folder name…"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <button
              className="workspace-switcher__new"
              onClick={() => {
                setOpen(false);
                setShowTemplateModal(true);
              }}>
              <Plus size={13} /> New Workspace…
            </button>
          </div>
        )}
      </div>
      {showTemplateModal && (
        <TemplateModal onClose={() => setShowTemplateModal(false)} />
      )}
    </>
  );
}
