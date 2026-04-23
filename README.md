# Causal Mapper

A browser-based visual diagramming tool for mapping the structure, relationships, and dynamics of complex systems. No server. No sign-up. Everything is stored locally in your browser.

![Node types: Icon Node, Sticky Note, Group Box, Schema Card](public/vite.svg)

---

## Features

### Canvas & Nodes
| Node type | Purpose |
|-----------|---------|
| **Icon Node** | Core component — pick any Lucide icon, add a label, description, status, tags, link, and custom attributes |
| **Sticky Note** | Free-form annotation for commentary, TODOs, or context |
| **Group Box** | Resizable colored bounding box for visually grouping related nodes into subsystems or layers |
| **Schema Card** | Table-style node for data models, config schemas, or any structured key-value content |

### Editing
- Drag tiles from the **palette** to add nodes; drag the canvas to pan
- **Smart edges** with configurable direction (one-way / bidirectional) and relationship labels
- Inline label editing; double-click Group Box or Schema Card labels to rename
- **Double-click** any node to enter resize mode — large grab handles appear on every edge and corner
- **Alignment guides** while dragging: snap lines appear when node edges align
- **Bulk edit** — shift-click or drag-select multiple nodes, then apply colour, tag, or status to all at once
- Right-click **context menu** on nodes, edges, and canvas for quick actions (duplicate, delete, focus, create here)

### Metadata (Side Panel)
Every node supports:
- Label, icon or custom image URL
- Long-form description (Markdown rendered inline via the ▾ button)
- Status badge: `planned` · `active` · `deprecated` · `critical`
- Tags (comma-separated), filterable via the tag chip bar
- External hyperlink (opens ↗ in new tab)
- Arbitrary key-value attributes (appear in PDF ledger and CSV export)
- Schema Card row management

### History & Workspaces
- **Undo / Redo** — full history for add, delete, drag, resize, and edge edits (Ctrl Z / Ctrl Shift Z)
- **Named snapshots** — save checkpoints at any moment; restore with one click
- **Multiple workspaces** — each with its own independent diagram and history
- **Folder groups** — organise workspaces into labelled folders
- Last-opened workspace is remembered across sessions (localStorage)
- **Starter template** — "Study App Demo" pre-populates a rich adaptive learning platform diagram using all node types

### Navigation & Discovery
- **Auto Layout** — Dagre left-to-right graph layout to untangle crowded diagrams
- **Focus mode** — right-click a node to dim everything not directly connected
- **Search** (Ctrl F) — pan and zoom to any matching node, non-matches dimmed
- **Tag filter bar** — click a tag chip to highlight only nodes carrying that tag
- **Presentation mode** — clean full-screen view, toolbar hidden
- **Hover tooltip** — lightweight preview on hover without clicking

### Export
| Format | Contents |
|--------|----------|
| **JSON** | Full workspace backup; importable into any Causal Mapper instance |
| **CSV** | Two-section spreadsheet: Elements + Interactions |
| **PNG** | High-resolution (3×) canvas screenshot, fit-to-view |
| **HTML** | Self-contained file — embedded screenshot + rendered tables |
| **PDF** | Multi-page report: cover page, diagram, element ledger, interaction details, dependency & impact matrix (flags SPOF nodes ≥ 3 connections) |

Custom branding (author, organisation, logo URL) appears on the PDF cover page.

---

## Tech Stack

| Library | Version | Role |
|---------|---------|------|
| React | 19 | UI framework |
| Vite | 6 | Build tool / dev server |
| ReactFlow | 11 | Canvas engine |
| Dexie | 4 | IndexedDB wrapper (local persistence) |
| jsPDF + html2canvas | 4 / 1.4 | PDF & screenshot export |
| Dagre | 3 | Auto-layout algorithm |
| Lucide React | 1.8 | Icon library |
| react-markdown | 10 | Inline description rendering |

All data lives in **IndexedDB** (via Dexie). No backend, no authentication, no network requests at runtime.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Project Structure

```
src/
├── components/
│   ├── Canvas.jsx          # Main ReactFlow canvas, drag-create, context menu
│   ├── Toolbar.jsx         # Top bar, export dropdown, keyboard shortcuts
│   ├── WorkspaceSwitcher.jsx
│   ├── SidePanel.jsx       # Metadata editor for selected node / edge
│   ├── BulkEditPanel.jsx   # Multi-select batch editor
│   ├── ContextMenu.jsx     # Right-click menu
│   ├── SnapshotManager.jsx # Named checkpoint UI
│   ├── HelpModal.jsx       # In-app help & guide
│   ├── IconNode.jsx        # Default element node
│   ├── GroupNode.jsx       # Bounding-box group
│   ├── StickyNote.jsx      # Annotation note
│   ├── CardNode.jsx        # Schema / key-value card
│   ├── SmartEdge.jsx       # Custom edge with label & direction
│   ├── IconPicker.jsx      # Lucide icon search modal
│   ├── HoverTooltip.jsx    # Hover preview
│   └── TemplateModal.jsx   # New workspace dialog
├── utils/
│   ├── autoLayout.js       # Dagre layout wrapper
│   ├── exportPDF.js        # jsPDF multi-page report generator
│   ├── icons.js            # Lucide icon registry
│   └── templates.js        # Starter template definitions
├── store.jsx               # Global state (useReducer + undo/redo + Dexie sync)
├── db.js                   # Dexie schema (systems, elements, interactions, snapshots)
└── index.css               # All styles (CSS custom properties, dark theme)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl Z` | Undo |
| `Ctrl Shift Z` / `Ctrl Y` | Redo |
| `Ctrl F` | Open search |
| `Escape` | Close search / dismiss menu |
| `Delete` | Delete selected node(s) or edge(s) |
| `Scroll` | Zoom canvas |
| `Shift + drag` | Multi-select |
| `Double-click` node | Enter resize mode |
| `Double-click` Group / Card label | Rename inline |
| `Alt + drag` canvas | Draw a new Group Box |

---

## Data Model

```
systems       id, title, purpose, folder
elements      id, systemId, type, position, data, style
interactions  id, systemId, source, target, data
snapshots     id, systemId, name, createdAt, elements, interactions
```

---

## License

MIT


The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
