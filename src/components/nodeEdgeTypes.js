// Stable module-level maps — defined here (not in Canvas.jsx) so HMR patches
// to individual node/edge components don't cause Canvas to recreate these
// objects, which would trigger React Flow warning #002.
import IconNode from "./IconNode";
import SmartEdge from "./SmartEdge";
import StickyNote from "./StickyNote";
import GroupNode from "./GroupNode";
import CardNode from "./CardNode";

export const NODE_TYPES = {
  iconNode: IconNode,
  stickyNote: StickyNote,
  groupNode: GroupNode,
  cardNode: CardNode,
};

export const EDGE_TYPES = { smart: SmartEdge };
