import dagre from "@dagrejs/dagre";

const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;

/**
 * Returns a new array of elements with updated positions
 * computed by dagre's directed graph layout.
 */
export function applyAutoLayout(elements, interactions, direction = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  elements.forEach((el) => {
    g.setNode(el.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  interactions.forEach((ix) => {
    if (g.hasNode(ix.source) && g.hasNode(ix.target)) {
      g.setEdge(ix.source, ix.target);
    }
  });

  dagre.layout(g);

  return elements.map((el) => {
    const node = g.node(el.id);
    return {
      ...el,
      position: {
        x: node.x - NODE_WIDTH / 2,
        y: node.y - NODE_HEIGHT / 2,
      },
    };
  });
}
