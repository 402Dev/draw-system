// Pre-built architecture starter templates
// Elements use placeholder IDs that get remapped on creation

const T = (id, label, icon, x, y) => ({
  id,
  type: "iconNode",
  position: { x, y },
  data: { label, iconName: icon, description: "" },
});

const I = (id, src, tgt) => ({
  id,
  source: src,
  target: tgt,
  data: { isBidirectional: false, natureOfInteraction: "" },
});

export const TEMPLATES = [
  {
    id: "blank",
    label: "Blank Canvas",
    description: "Start from scratch.",
    elements: [],
    interactions: [],
  },
  {
    id: "three-tier",
    label: "3-Tier Architecture",
    description: "Presentation → Application → Data layers.",
    elements: [
      T("a", "Client / Browser", "Monitor", 300, 60),
      T("b", "Load Balancer", "Shuffle", 300, 180),
      T("c", "Web Server", "Globe", 150, 300),
      T("d", "Web Server", "Globe", 450, 300),
      T("e", "App Server", "Server", 300, 420),
      T("f", "Cache", "Zap", 550, 420),
      T("g", "Database Primary", "Database", 200, 540),
      T("h", "Database Replica", "Database", 400, 540),
    ],
    interactions: [
      I("i1", "a", "b"),
      I("i2", "b", "c"),
      I("i3", "b", "d"),
      I("i4", "c", "e"),
      I("i5", "d", "e"),
      I("i6", "e", "f"),
      I("i7", "e", "g"),
      I("i8", "g", "h"),
    ],
  },
  {
    id: "event-driven",
    label: "Event-Driven",
    description: "Services communicating through an event bus.",
    elements: [
      T("a", "Service A", "Box", 100, 200),
      T("b", "Service B", "Box", 100, 400),
      T("c", "Event Bus", "Radio", 350, 300),
      T("d", "Service C", "Box", 600, 200),
      T("e", "Service D", "Box", 600, 400),
      T("f", "Event Store", "Archive", 350, 480),
    ],
    interactions: [
      I("i1", "a", "c"),
      I("i2", "b", "c"),
      I("i3", "c", "d"),
      I("i4", "c", "e"),
      I("i5", "c", "f"),
    ],
  },
  {
    id: "microservices",
    label: "Microservices",
    description: "API Gateway routing to independent bounded-context services.",
    elements: [
      T("a", "Mobile App", "Smartphone", 350, 40),
      T("b", "Web App", "Monitor", 150, 40),
      T("c", "API Gateway", "Shield", 280, 160),
      T("d", "Auth Service", "Lock", 80, 300),
      T("e", "User Service", "Users", 240, 300),
      T("f", "Order Service", "ShoppingCart", 400, 300),
      T("g", "Product Service", "Package", 560, 300),
      T("h", "Notification Service", "Bell", 320, 440),
      T("i", "Shared DB", "Database", 180, 440),
      T("j", "Message Queue", "Radio", 480, 440),
    ],
    interactions: [
      I("i1", "a", "c"),
      I("i2", "b", "c"),
      I("i3", "c", "d"),
      I("i4", "c", "e"),
      I("i5", "c", "f"),
      I("i6", "c", "g"),
      I("i7", "e", "i"),
      I("i8", "f", "i"),
      I("i9", "f", "j"),
      I("i10", "j", "h"),
    ],
  },
];
