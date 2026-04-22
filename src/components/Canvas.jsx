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
import IconPicker from "./IconPicker";
import HoverTooltip from "./HoverTooltip";
import SidePanel from "./SidePanel";

// Defined at module level so React Flow never sees a new reference
const NODE_TYPES = { iconNode: IconNode };
const EDGE_TYPES = { smart: SmartEdge };

function toRFNodes(elements) {
  return elements.map((el) => ({
    id: el.id,
    type: el.type || "iconNode",
    position: el.position,
    data: el.data,
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

export default function Canvas() {
  const { state, actions } = useStore();
  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Pending new element waiting for icon selection
  const [pendingElement, setPendingElement] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Side panel selection
  const [selected, setSelected] = useState(null);

  // Hover tooltip
  const [tooltip, setTooltip] = useState(null); // { item, type, position }
  const hoverTimer = useRef(null);

  // Sync store → RF whenever loaded or store changes
  useEffect(() => {
    if (!state.loaded) return;
    setNodes(toRFNodes(state.elements));
  }, [state.elements, state.loaded]);

  useEffect(() => {
    if (!state.loaded) return;
    setEdges(toRFEdges(state.interactions));
  }, [state.interactions, state.loaded]);

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

  // ── Connections ───────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection) => {
      actions.addInteraction(connection);
    },
    [actions],
  );

  // ── Node position changes ─────────────────────────────────────────────────
  const onNodeDragStop = useCallback(
    (_e, node) => {
      actions.moveElement(node.id, node.position);
    },
    [actions],
  );

  // ── Selection ─────────────────────────────────────────────────────────────
  const onNodeClick = useCallback((_e, node) => {
    setSelected({ type: "node", id: node.id });
  }, []);

  const onEdgeClick = useCallback((_e, edge) => {
    setSelected({ type: "edge", id: edge.id });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelected(null);
  }, []);

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
      return {
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
        markerStart: ix?.data?.isBidirectional
          ? { type: MarkerType.ArrowClosed, color: "#6366f1" }
          : undefined,
        data: ix?.data || e.data,
      };
    });
  }, [edges, state.interactions]);

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      {/* Drop zone palette */}
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
      </div>

      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
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

      {/* Hover tooltip */}
      {tooltip && (
        <HoverTooltip
          item={tooltip.item}
          type={tooltip.type}
          position={tooltip.position}
        />
      )}

      {/* Side panel */}
      <SidePanel selected={selected} onClose={() => setSelected(null)} />

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
