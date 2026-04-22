import { useState } from "react";
import { X } from "lucide-react";

const SECTIONS = [
  {
    id: "intro",
    label: "Introduction",
    content: (
      <>
        <h2>Welcome to Causal Mapper</h2>
        <p>
          Causal Mapper is a visual diagramming tool for mapping out the
          structure, relationships, and dynamics of complex systems —
          architectures, organisations, workflows, or any domain where
          understanding <em>cause and effect</em> matters.
        </p>
        <p>
          Everything lives in your browser (IndexedDB) — no server, no signup.
          You can have multiple <strong>workspaces</strong>, each with its own
          diagram, and export to PDF, PNG, HTML, or CSV at any time.
        </p>

        <h3>Core concepts</h3>
        <ul>
          <li>
            <strong>Element</strong> — a node on the canvas representing a
            component, actor, service, or concept.
          </li>
          <li>
            <strong>Interaction</strong> — a directed edge describing how one
            element influences or depends on another.
          </li>
          <li>
            <strong>Workspace</strong> — an independent diagram. Switch or
            create workspaces with the dropdown in the top-left.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "canvas",
    label: "Canvas basics",
    content: (
      <>
        <h2>Canvas basics</h2>

        <h3>Navigation</h3>
        <ul>
          <li>
            <kbd>Scroll</kbd> — zoom in / out.
          </li>
          <li>
            <kbd>Drag</kbd> on empty space — pan the canvas.
          </li>
          <li>
            <kbd>Drag</kbd> a node — move it. Alignment guides appear when edges
            line up with other nodes.
          </li>
          <li>
            <kbd>Ctrl + Scroll</kbd> — fine zoom.
          </li>
        </ul>

        <h3>Adding elements</h3>
        <p>
          Drag a tile from the <strong>palette strip</strong> at the bottom of
          the canvas onto the diagram:
        </p>
        <ul>
          <li>
            <strong>New Element</strong> — standard icon node.
          </li>
          <li>
            <strong>Sticky Note</strong> — free-form annotation.
          </li>
          <li>
            <strong>Group Box</strong> — a resizable bounding box to visually
            cluster related nodes.
          </li>
          <li>
            <strong>Schema Card</strong> — a structured key-value table node,
            great for data models or config schemas.
          </li>
        </ul>

        <h3>Connecting elements</h3>
        <p>
          Hover over a node until the blue <strong>handle dots</strong> appear
          on its edges. Drag from any handle to another node to create an
          interaction. The edge type (one-way or bidirectional) can be changed
          in the side panel after selection.
        </p>

        <h3>Selecting & deleting</h3>
        <ul>
          <li>Click a node or edge to select it.</li>
          <li>
            <kbd>Shift + click</kbd> / drag a selection box for multi-select.
          </li>
          <li>
            <kbd>Delete</kbd> key removes the selected node(s) or edge(s).
          </li>
        </ul>

        <h3>Right-click context menu</h3>
        <p>
          Right-click any node, edge, or blank canvas area for context actions:
          duplicate, delete, set focus mode, or create new nodes at that
          position.
        </p>
      </>
    ),
  },
  {
    id: "elements",
    label: "Elements & metadata",
    content: (
      <>
        <h2>Elements &amp; metadata</h2>
        <p>
          Click any node or edge to open the <strong>Side Panel</strong> on the
          right. Every element supports rich metadata:
        </p>

        <h3>Label &amp; icon</h3>
        <p>
          Edit the element name and pick any icon from the built-in library. You
          can also paste an image URL to use a custom logo.
        </p>

        <h3>Description &amp; purpose</h3>
        <p>
          Add a long-form description. Click the{" "}
          <strong>chevron (▾) button</strong> on a node to expand an inline
          preview directly on the canvas.
        </p>

        <h3>Status badge</h3>
        <p>
          Set a lifecycle status — <em>Planned</em>, <em>Active</em>,{" "}
          <em>Deprecated</em>, or <em>Critical</em>. A colour dot appears in the
          node's corner.
        </p>

        <h3>External hyperlink</h3>
        <p>
          Paste a URL into the Link field. A small <strong>↗</strong> icon
          appears on the node; clicking it opens the URL in a new tab.
        </p>

        <h3>Tags</h3>
        <p>
          Comma-separated tags. Use the <strong>tag filter chip bar</strong>{" "}
          below the toolbar to highlight only elements matching a tag.
        </p>

        <h3>Custom key-value attributes</h3>
        <p>
          Add arbitrary metadata rows (e.g. <code>owner: platform-team</code>,{" "}
          <code>SLA: 99.9%</code>). These appear in the PDF ledger and CSV
          export.
        </p>

        <h3>Schema Card rows</h3>
        <p>
          When a <strong>Schema Card</strong> node is selected, add or remove
          key-value rows directly in the side panel. The card renders them as a
          compact table on the canvas.
        </p>

        <h3>Interactions (edges)</h3>
        <p>
          Click an edge to edit its label, direction (one-way vs bidirectional),
          and the nature of the relationship in each direction. This appears in
          the Interaction Details section of the PDF.
        </p>
      </>
    ),
  },
  {
    id: "workspace",
    label: "Workspaces & workflow",
    content: (
      <>
        <h2>Workspaces &amp; workflow</h2>

        <h3>Multiple workspaces</h3>
        <p>
          Use the <strong>workspace switcher</strong> (top-left dropdown) to
          switch between diagrams, rename them, or create new ones. Click the
          folder icon next to any workspace to assign it to a folder group.
        </p>

        <h3>Starter templates</h3>
        <p>
          When creating a new workspace, choose a template to pre-populate the
          canvas with a typical architecture pattern:
        </p>
        <ul>
          <li>
            <strong>Blank</strong> — empty canvas.
          </li>
          <li>
            <strong>Three-Tier</strong> — Presentation / Logic / Data layers.
          </li>
          <li>
            <strong>Event-Driven</strong> — producers, broker, consumers.
          </li>
          <li>
            <strong>Microservices</strong> — API gateway, multiple services,
            shared DB.
          </li>
        </ul>

        <h3>Undo / Redo</h3>
        <p>
          <kbd>Ctrl Z</kbd> / <kbd>Ctrl Shift Z</kbd> (or the toolbar buttons)
          step through a full history of every canvas change.
        </p>

        <h3>Auto Layout</h3>
        <p>
          Click <strong>Auto Layout</strong> in the toolbar to automatically
          arrange all nodes using a left-to-right Dagre graph layout. Useful
          when a diagram becomes tangled.
        </p>

        <h3>Named Snapshots</h3>
        <p>
          Click the <strong>camera icon</strong> in the toolbar to open the
          Snapshot Manager. Save a named checkpoint at any point; restore it
          later to revert the entire diagram to that state. Snapshots are
          workspace-scoped.
        </p>

        <h3>Bulk editing</h3>
        <p>
          Select two or more nodes (Shift+click or drag-select). A{" "}
          <strong>Bulk Edit panel</strong> appears at the bottom of the canvas,
          letting you apply a colour, tag, or status to all selected nodes at
          once.
        </p>

        <h3>Focus mode</h3>
        <p>
          Right-click a node and choose <strong>Focus on this node</strong>. All
          unconnected nodes are dimmed so you can trace relationships without
          distraction. Click <strong>Exit</strong> in the focus badge to return
          to normal view.
        </p>

        <h3>Search</h3>
        <p>
          Press <kbd>Ctrl F</kbd> or click the search icon. Type a label
          fragment — the canvas pans and zooms to the first matching element,
          and non-matching nodes are dimmed.
        </p>
      </>
    ),
  },
  {
    id: "exports",
    label: "Exporting & reporting",
    content: (
      <>
        <h2>Exporting &amp; reporting</h2>

        <h3>Save JSON</h3>
        <p>
          Exports the complete workspace (system metadata, all elements and
          interactions) as a <code>.json</code> file. Use{" "}
          <strong>Import</strong> to load it back into any Causal Mapper
          instance.
        </p>

        <h3>CSV</h3>
        <p>
          Exports a two-section CSV — Elements (id, label, type, status, url,
          tags, attributes) followed by Interactions (source, target, direction,
          nature). Open in Excel or Google Sheets for further analysis.
        </p>

        <h3>PNG</h3>
        <p>
          Takes a high-resolution (3×) screenshot of the canvas, automatically
          fit-to-view before capture. Ideal for presentations or documentation.
        </p>

        <h3>HTML</h3>
        <p>
          Generates a fully self-contained <code>.html</code> file — embedded
          PNG screenshot plus rendered tables of elements and interactions.
          Share it as a single file with no server needed.
        </p>

        <h3>Export PDF</h3>
        <p>A multi-page PDF report containing:</p>
        <ol>
          <li>
            <strong>Cover page</strong> — title, author, organisation, logo (set
            these in <em>System Info &amp; Branding</em> via the ⚙ icon),
            timestamp, and system purpose.
          </li>
          <li>
            <strong>System diagram</strong> — full-canvas screenshot,
            fit-to-view.
          </li>
          <li>
            <strong>Element ledger</strong> — table of every element with its
            purpose and outgoing connections.
          </li>
          <li>
            <strong>Interaction details</strong> — each edge with source,
            target, direction, and nature text.
          </li>
          <li>
            <strong>Dependency &amp; Impact Matrix</strong> — in-degree,
            out-degree, and total connections per element. Elements with ≥ 3
            total connections are flagged as potential single points of failure
            (⚠ SPOF).
          </li>
        </ol>

        <h3>Custom branding</h3>
        <p>
          Click the <strong>⚙</strong> (Settings) icon in the toolbar to open
          the <em>System Info &amp; Branding</em> panel. Fill in Author,
          Organisation, and optionally a Logo URL — these appear on the PDF
          cover page.
        </p>
      </>
    ),
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    content: (
      <>
        <h2>Keyboard shortcuts</h2>
        <table className="help-table">
          <thead>
            <tr>
              <th>Shortcut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <kbd>Ctrl Z</kbd>
              </td>
              <td>Undo</td>
            </tr>
            <tr>
              <td>
                <kbd>Ctrl Shift Z</kbd> / <kbd>Ctrl Y</kbd>
              </td>
              <td>Redo</td>
            </tr>
            <tr>
              <td>
                <kbd>Ctrl F</kbd>
              </td>
              <td>Open search bar</td>
            </tr>
            <tr>
              <td>
                <kbd>Escape</kbd>
              </td>
              <td>Close search / dismiss menu</td>
            </tr>
            <tr>
              <td>
                <kbd>Delete</kbd>
              </td>
              <td>Delete selected node(s) / edge(s)</td>
            </tr>
            <tr>
              <td>
                <kbd>Scroll</kbd>
              </td>
              <td>Zoom canvas</td>
            </tr>
            <tr>
              <td>
                <kbd>Shift + drag</kbd>
              </td>
              <td>Multi-select nodes</td>
            </tr>
            <tr>
              <td>
                <kbd>Double-click</kbd> node label
              </td>
              <td>Inline-edit label (Group Box / Schema Card)</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: "tips",
    label: "Tips & best practices",
    content: (
      <>
        <h2>Tips &amp; best practices</h2>

        <h3>Start small, grow iteratively</h3>
        <p>
          Begin with 5-10 core elements and a clear system boundary. Add detail
          gradually — it's easier to add complexity than to untangle an
          over-crowded diagram.
        </p>

        <h3>Use Group Boxes to show subsystems</h3>
        <p>
          Drag a <strong>Group Box</strong> onto the canvas, position it behind
          related nodes, and label it with the subsystem name. This adds visual
          structure without cluttering the graph.
        </p>

        <h3>Status badges for project tracking</h3>
        <p>
          Set <em>Planned / Active / Deprecated / Critical</em> status on
          elements to turn your architecture diagram into a living project
          tracker. Filter by tag to focus on a layer at a time.
        </p>

        <h3>Save snapshots before major changes</h3>
        <p>
          Before reorganising or deleting a section of your diagram, save a
          named snapshot. If the result isn't better, restore in one click.
        </p>

        <h3>Use tags for cross-cutting concerns</h3>
        <p>
          Tag elements with <code>security</code>, <code>performance</code>,{" "}
          <code>team-A</code>, etc. Use the tag filter to instantly highlight
          every element in a concern area across the whole diagram.
        </p>

        <h3>Dependency matrix as a risk tool</h3>
        <p>
          Export to PDF and check the <strong>Dependency Matrix</strong> page.
          Elements flagged ⚠ SPOF have the most connections — they are
          candidates for resilience investment (redundancy, circuit-breakers,
          caching).
        </p>

        <h3>Hyperlinks as living documentation</h3>
        <p>
          Add a URL to each element pointing to its runbook, ADR, GitHub repo,
          or Confluence page. The diagram becomes a navigable index into your
          documentation.
        </p>
      </>
    ),
  },
];

export default function HelpModal({ onClose }) {
  const [activeId, setActiveId] = useState("intro");
  const active = SECTIONS.find((s) => s.id === activeId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="help-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Help & Guide">
        {/* Sidebar nav */}
        <nav className="help-modal__nav">
          <div className="help-modal__nav-title">Help &amp; Guide</div>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`help-modal__nav-item ${activeId === s.id ? "help-modal__nav-item--active" : ""}`}
              onClick={() => setActiveId(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="help-modal__body">
          <button
            className="help-modal__close"
            onClick={onClose}
            title="Close help">
            <X size={18} />
          </button>
          <div className="help-modal__content">{active?.content}</div>
        </div>
      </div>
    </div>
  );
}
