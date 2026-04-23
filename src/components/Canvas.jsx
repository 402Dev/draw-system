import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from "reactflow";
import "reactflow/dist/style.css";

import { useStore } from "../store";
import IconNode from "./IconNode";
import SmartEdge from "./SmartEdge";
import StickyNote from "./StickyNote";
import GroupNode from "./GroupNode";
import CardNode from "./CardNode";
import IconPicker from "./IconPicker";
import HoverTooltip from "./HoverTooltip";
import SidePanel from "./SidePanel";
import ContextMenu from "./ContextMenu";
import BulkEditPanel from "./BulkEditPanel";

// Defined at module level so React Flow never sees a new reference
const NODE_TYPES = {
  iconNode: IconNode,
  stickyNote: StickyNote,
  groupNode: GroupNode,
  cardNode: CardNode,
};
const EDGE_TYPES = { smart: SmartEdge };

function toRFNodes(elements) {
  return elements.map((el) => ({
    id: el.id,
    type: el.type || "iconNode",
    position: el.position,
    data: el.data,
    style: el.style,
    zIndex: el.zIndex ?? (el.type === "groupNode" ? -1 : 0),
  }));
}

function toRFEdges(interactions) {
  return interactions.map((ix) => ({
    id: ix.id,
    source: ix.source,
    target: ix.target,
    sourceHandle: ix.sourceHandle,
    targetHandle: ix.targetHandle,
    type: "smart",
    data: ix.data,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
    markerStart: ix.data?.isBidirectional
      ? { type: MarkerType.ArrowClosed, color: "#6366f1" }
      : undefined,
  }));
}

export default function Canvas({ searchQuery }) {
  const { state, actions } = useStore();
  const presentationMode = state.presentationMode;
  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Pending new element waiting for icon selection
  const [pendingElement, setPendingElement] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Side panel selection
  const [selected, setSelected] = useState(null);

  // Active tag filter
  const [activeTag, setActiveTag] = useState(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null); // {x, y, items}

  // Alignment guides (shown while dragging)
  const [guides, setGuides] = useState([]); // [{axis: 'x'|'y', pos}]

  // Bulk selection
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  // Focus mode (isolate node + direct connections)
  const [focusedNodeId, setFocusedNodeId] = useState(null);

  // Hover tooltip
  const [tooltip, setTooltip] = useState(null); // { item, type, position }

  // Alt+drag draw-a-group-box mode
  const [altDown, setAltDown] = useState(false);
  const [drawingBox, setDrawingBox] = useState(null); // {startX,startY,curX,curY} in wrapper-relative px

  // Resize mode: double-click a node to show handles, click canvas/other node to hide
  const [resizingNodeId, setResizingNodeId] = useState(null);
  const hoverTimer = useRef(null);

  // Track Alt key to enable draw-group-box mode
  useEffect(() => {
    const down = (e) => {
      if (e.key === "Alt") {
        e.preventDefault();
        setAltDown(true);
      }
    };
    const up = (e) => {
      if (e.key === "Alt") {
        setAltDown(false);
        setDrawingBox(null); // cancel any in-progress draw
      }
    };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
    };
  }, []);

  // Sync store → RF whenever loaded or store changes
  useEffect(() => {
    if (!state.loaded) return;
    setNodes(toRFNodes(state.elements));
  }, [state.elements, state.loaded]);

  useEffect(() => {
    if (!state.loaded) return;
    setEdges(toRFEdges(state.interactions));
  }, [state.interactions, state.loaded]);

  // Auto fit-view whenever the active workspace changes
  useEffect(() => {
    if (!rfInstance || !state.loaded) return;
    // Delay so ReactFlow has time to lay out the new nodes
    const t = setTimeout(() => {
      rfInstance.fitView({ padding: 0.15, duration: 400 });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.system.id, rfInstance]);

  // ── Search: pan to matching node ─────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || !rfInstance) return;
    const q = searchQuery.toLowerCase();
    const match = state.elements.find((el) =>
      (el.data?.label || "").toLowerCase().includes(q),
    );
    if (match) {
      rfInstance.setCenter(match.position.x + 60, match.position.y + 40, {
        zoom: 1.5,
        duration: 600,
      });
    }
  }, [searchQuery, rfInstance, state.elements]);

  // ── Drag-to-create ────────────────────────────────────────────────────────
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const createElementAt = useCallback(
    (clientX, clientY) => {
      if (!rfInstance) return;
      const position = rfInstance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });
      const el = actions.addElement(position);
      setPendingElement(el);
      setShowIconPicker(true);
    },
    [rfInstance, actions],
  );

  const onCreateAtCenter = useCallback(() => {
    if (!rfInstance || !reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
    const el = actions.addElement(position);
    setPendingElement(el);
    setShowIconPicker(true);
  }, [rfInstance, actions]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (!rfInstance || !reactFlowWrapper.current) return;
      if (e.dataTransfer.getData("application/causal-node") !== "new") return;
      createElementAt(e.clientX, e.clientY);
    },
    [rfInstance, createElementAt],
  );

  const onIconSelected = useCallback(
    (iconName) => {
      if (!pendingElement) return;
      actions.updateElement(pendingElement.id, {
        data: { iconName, customImage: undefined },
      });
      setShowIconPicker(false);
      setSelected({ type: "node", id: pendingElement.id });
      setPendingElement(null);
    },
    [pendingElement, actions],
  );

  const onImageUploaded = useCallback(
    (dataUrl) => {
      if (!pendingElement) return;
      actions.updateElement(pendingElement.id, {
        data: { customImage: dataUrl },
      });
      setShowIconPicker(false);
      setSelected({ type: "node", id: pendingElement.id });
      setPendingElement(null);
    },
    [pendingElement, actions],
  );

  const onIconPickerClose = useCallback(() => {
    setShowIconPicker(false);
    if (pendingElement) {
      setSelected({ type: "node", id: pendingElement.id });
      setPendingElement(null);
    }
  }, [pendingElement]);

  const onCreateStickyNote = useCallback(() => {
    if (!rfInstance || !reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
    actions.addStickyNote(position);
  }, [rfInstance, actions]);

  // ── Draw-group-box overlay handlers ──────────────────────────────────────
  const onOverlayMouseDown = useCallback(
    (e) => {
      if (!rfInstance || !reactFlowWrapper.current) return;
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      setDrawingBox({ startX: sx, startY: sy, curX: sx, curY: sy });
    },
    [rfInstance],
  );

  const onOverlayMouseMove = useCallback(
    (e) => {
      if (!drawingBox || !reactFlowWrapper.current) return;
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      setDrawingBox((prev) => ({
        ...prev,
        curX: e.clientX - rect.left,
        curY: e.clientY - rect.top,
      }));
    },
    [drawingBox],
  );

  const onOverlayMouseUp = useCallback(
    (e) => {
      if (!drawingBox || !rfInstance || !reactFlowWrapper.current) return;
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const x1 = Math.min(drawingBox.startX, drawingBox.curX);
      const y1 = Math.min(drawingBox.startY, drawingBox.curY);
      const x2 = Math.max(drawingBox.startX, drawingBox.curX);
      const y2 = Math.max(drawingBox.startY, drawingBox.curY);
      if (x2 - x1 > 20 && y2 - y1 > 20) {
        const flowTL = rfInstance.screenToFlowPosition({
          x: rect.left + x1,
          y: rect.top + y1,
        });
        const flowBR = rfInstance.screenToFlowPosition({
          x: rect.left + x2,
          y: rect.top + y2,
        });
        actions.addElementRaw({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          systemId: "default-system",
          type: "groupNode",
          position: { x: flowTL.x, y: flowTL.y },
          style: { width: flowBR.x - flowTL.x, height: flowBR.y - flowTL.y },
          zIndex: -1,
          data: {
            label: "Group",
            color: "rgba(99,102,241,0.08)",
            borderColor: "#6366f1",
          },
        });
      }
      setDrawingBox(null);
    },
    [drawingBox, rfInstance, actions],
  );

  const onCreateCardNode = useCallback(() => {
    if (!rfInstance || !reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
    actions.addElementRaw({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      systemId: "default-system",
      type: "cardNode",
      position,
      data: { label: "Schema", rows: [] },
    });
  }, [rfInstance, actions]);

  // Multi-select handler
  const onSelectionChange = useCallback(({ nodes: selNodes }) => {
    const ids = (selNodes || []).map((n) => n.id);
    setSelectedNodeIds(ids);
    if (ids.length >= 2) setShowBulkPanel(true);
    else setShowBulkPanel(false);
  }, []);

  const onConnect = useCallback(
    (connection) => {
      actions.addInteraction(connection);
    },
    [actions],
  );

  // ── Node position changes ─────────────────────────────────────────────────
  const onNodeDrag = useCallback(
    (_e, node) => {
      // Compute alignment guides
      const SNAP_DIST = 6;
      const newGuides = [];
      const cx = node.position.x + (node.width || 120) / 2;
      const cy = node.position.y + (node.height || 80) / 2;
      nodes.forEach((n) => {
        if (n.id === node.id) return;
        const ox = n.position.x + (n.width || 120) / 2;
        const oy = n.position.y + (n.height || 80) / 2;
        if (Math.abs(cx - ox) < SNAP_DIST)
          newGuides.push({ axis: "x", pos: ox });
        if (Math.abs(cy - oy) < SNAP_DIST)
          newGuides.push({ axis: "y", pos: oy });
      });
      setGuides(newGuides);
    },
    [nodes],
  );

  const onNodeDragStop = useCallback(
    (_e, node) => {
      actions.snapshot();
      actions.moveElement(node.id, node.position);
      setGuides([]);
    },
    [actions],
  );

  // ── Selection ─────────────────────────────────────────────────────────────
  const onNodeClick = useCallback((_e, node) => {
    setResizingNodeId(null); // single-click cancels resize mode
    setSelected({ type: "node", id: node.id });
  }, []);

  const onNodeDoubleClick = useCallback((_e, node) => {
    setResizingNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onEdgeClick = useCallback((_e, edge) => {
    setSelected({ type: "edge", id: edge.id });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelected(null);
    setContextMenu(null);
    setFocusedNodeId(null);
    setResizingNodeId(null);
  }, []);

  // ── Context Menu ──────────────────────────────────────────────────────────
  const onNodeContextMenu = useCallback(
    (e, node) => {
      e.preventDefault();
      const el = state.elements.find((el) => el.id === node.id);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: "Open in Panel",
            onClick: () => setSelected({ type: "node", id: node.id }),
          },
          {
            label: focusedNodeId === node.id ? "Exit Focus Mode" : "Focus Mode",
            onClick: () =>
              setFocusedNodeId((prev) => (prev === node.id ? null : node.id)),
          },
          { separator: true },
          {
            label: "Duplicate",
            onClick: () => {
              if (!el) return;
              actions.addElementRaw({
                ...el,
                id: crypto.randomUUID(),
                position: {
                  x: el.position.x + 40,
                  y: el.position.y + 40,
                },
              });
            },
          },
          {
            label: "Delete",
            danger: true,
            onClick: () => {
              actions.deleteElement(node.id);
              setSelected(null);
            },
          },
        ],
      });
    },
    [state.elements, focusedNodeId, actions],
  );

  const onEdgeContextMenu = useCallback(
    (e, edge) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: "Open in Panel",
            onClick: () => setSelected({ type: "edge", id: edge.id }),
          },
          { separator: true },
          {
            label: "Delete",
            danger: true,
            onClick: () => {
              actions.deleteInteraction(edge.id);
              setSelected(null);
            },
          },
        ],
      });
    },
    [actions],
  );

  const onPaneContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: "New Element here",
            onClick: () => createElementAt(e.clientX, e.clientY),
          },
          {
            label: "New Sticky Note here",
            onClick: () => {
              if (!rfInstance) return;
              const pos = rfInstance.screenToFlowPosition({
                x: e.clientX,
                y: e.clientY,
              });
              actions.addStickyNote(pos);
            },
          },
        ],
      });
    },
    [rfInstance, actions, createElementAt],
  );

  // ── Hover tooltip (500 ms) ────────────────────────────────────────────────
  const startHover = useCallback((item, type, e) => {
    clearTimeout(hoverTimer.current);
    const pos = { x: e.clientX, y: e.clientY };
    hoverTimer.current = setTimeout(() => {
      setTooltip({ item, type, position: pos });
    }, 500);
  }, []);

  const endHover = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setTooltip(null);
  }, []);

  const onNodeMouseEnter = useCallback(
    (e, node) => {
      const el = state.elements.find((el) => el.id === node.id);
      if (el) startHover(el, "node", e);
    },
    [state.elements, startHover],
  );

  const onNodeMouseLeave = useCallback(() => endHover(), [endHover]);

  const onEdgeMouseEnter = useCallback(
    (e, edge) => {
      const ix = state.interactions.find((i) => i.id === edge.id);
      if (!ix) return;
      const elementById = Object.fromEntries(
        state.elements.map((el) => [el.id, el]),
      );
      const enriched = {
        ...ix,
        _sourceLabel: elementById[ix.source]?.data?.label,
        _targetLabel: elementById[ix.target]?.data?.label,
      };
      startHover(enriched, "edge", e);
    },
    [state.interactions, state.elements, startHover],
  );

  const onEdgeMouseLeave = useCallback(() => endHover(), [endHover]);

  // ── Nodes with updated edge markers when interactions change ─────────────
  const styledEdges = useMemo(() => {
    return edges.map((e) => {
      const ix = state.interactions.find((i) => i.id === e.id);
      const edgeColor = ix?.data?.color || "#6366f1";
      return {
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        markerStart: ix?.data?.isBidirectional
          ? { type: MarkerType.ArrowClosed, color: edgeColor }
          : undefined,
        data: ix?.data || e.data,
      };
    });
  }, [edges, state.interactions]);

  // ── Tag filtering ────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const set = new Set();
    state.elements.forEach((el) => {
      const raw = el.data?.tags || "";
      const arr = Array.isArray(raw)
        ? raw
        : raw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
      arr.forEach((t) => set.add(t));
    });
    return [...set];
  }, [state.elements]);

  const filteredNodes = useMemo(() => {
    let result = nodes;

    // Tag filter
    if (activeTag) {
      result = result.map((n) => {
        const el = state.elements.find((e) => e.id === n.id);
        const raw = el?.data?.tags || "";
        const tagArr = Array.isArray(raw)
          ? raw
          : raw
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
        const hasTag = tagArr.includes(activeTag);
        return { ...n, style: { ...n.style, opacity: hasTag ? 1 : 0.2 } };
      });
    }

    // Focus mode: highlight only focused node + direct neighbours
    if (focusedNodeId) {
      const connected = new Set([focusedNodeId]);
      state.interactions.forEach((ix) => {
        if (ix.source === focusedNodeId) connected.add(ix.target);
        if (ix.target === focusedNodeId) connected.add(ix.source);
      });
      result = result.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: connected.has(n.id) ? 1 : 0.12,
          transition: "opacity 0.2s",
        },
      }));
    }

    // Search highlight
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.map((n) => {
        const el = state.elements.find((e) => e.id === n.id);
        const matches = (el?.data?.label || "").toLowerCase().includes(q);
        return {
          ...n,
          style: { ...n.style, opacity: matches ? 1 : 0.25 },
        };
      });
    }

    return result.map((n) => ({
      ...n,
      data: { ...n.data, _resizing: n.id === resizingNodeId },
    }));
  }, [
    nodes,
    activeTag,
    focusedNodeId,
    searchQuery,
    resizingNodeId,
    state.elements,
    state.interactions,
  ]);

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      {/* Alt+drag draw-group-box overlay */}
      {altDown && !presentationMode && (
        <div
          className="group-draw-overlay"
          onMouseDown={onOverlayMouseDown}
          onMouseMove={onOverlayMouseMove}
          onMouseUp={onOverlayMouseUp}>
          {drawingBox && (
            <div
              className="group-draw-rect"
              style={{
                left: Math.min(drawingBox.startX, drawingBox.curX),
                top: Math.min(drawingBox.startY, drawingBox.curY),
                width: Math.abs(drawingBox.curX - drawingBox.startX),
                height: Math.abs(drawingBox.curY - drawingBox.startY),
              }}
            />
          )}
          {!drawingBox && (
            <div className="group-draw-hint">Draw a group box</div>
          )}
        </div>
      )}

      {/* Drop zone palette */}
      {!presentationMode && (
        <div className="drop-palette">
          <div
            className="drop-palette__item"
            draggable
            onClick={onCreateAtCenter}
            onDragStart={(e) =>
              e.dataTransfer.setData("application/causal-node", "new")
            }
            title="Click or drag onto canvas to create element">
            <span className="drop-palette__plus">+</span>
            <span>New Element</span>
          </div>
          <div
            className="drop-palette__item"
            onClick={onCreateStickyNote}
            title="Add sticky note">
            <span className="drop-palette__plus">📝</span>
            <span>Sticky Note</span>
          </div>
          <div
            className="drop-palette__item drop-palette__item--hint"
            title="Hold Alt and drag on the canvas to draw a group box">
            <span className="drop-palette__plus">⬜</span>
            <span>Alt+drag = Group</span>
          </div>
          <div
            className="drop-palette__item"
            onClick={onCreateCardNode}
            title="Add schema card">
            <span className="drop-palette__plus">🗂</span>
            <span>Schema Card</span>
          </div>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-filter-pill ${activeTag === tag ? "tag-filter-pill--active" : ""}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}>
              {tag}
            </button>
          ))}
          {activeTag && (
            <button
              className="tag-filter-pill tag-filter-pill--clear"
              onClick={() => setActiveTag(null)}>
              ✕ Clear
            </button>
          )}
        </div>
      )}

      <ReactFlow
        nodes={filteredNodes}
        edges={styledEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onSelectionChange={onSelectionChange}
        onInit={setRfInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        deleteKeyCode="Delete"
        style={{ width: "100%", height: "100%" }}
        proOptions={{ hideAttribution: true }}>
        <Background color="#2a2a3e" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: "#1a1a2e" }}
        />
      </ReactFlow>

      {/* Alignment guides */}
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div
            key={i}
            className="align-guide align-guide--x"
            style={{ left: `${g.pos}px` }}
          />
        ) : (
          <div
            key={i}
            className="align-guide align-guide--y"
            style={{ top: `${g.pos}px` }}
          />
        ),
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <HoverTooltip
          item={tooltip.item}
          type={tooltip.type}
          position={tooltip.position}
        />
      )}

      {/* Side panel */}
      {!presentationMode && (
        <SidePanel selected={selected} onClose={() => setSelected(null)} />
      )}

      {/* Bulk edit panel */}
      {!presentationMode && showBulkPanel && (
        <BulkEditPanel
          selectedIds={selectedNodeIds}
          onClose={() => setShowBulkPanel(false)}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Focus mode indicator */}
      {focusedNodeId && (
        <div className="focus-mode-badge">
          Focus Mode —{" "}
          <button
            className="focus-mode-badge__exit"
            onClick={() => setFocusedNodeId(null)}>
            Exit
          </button>
        </div>
      )}

      {/* Icon picker for new nodes */}
      {showIconPicker && (
        <IconPicker
          current={pendingElement?.data?.iconName}
          onSelect={onIconSelected}
          onUpload={onImageUploaded}
          onClose={onIconPickerClose}
        />
      )}
    </div>
  );
}
