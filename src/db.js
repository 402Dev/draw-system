import Dexie from "dexie";

export const db = new Dexie("CausalMapperDB");

db.version(1).stores({
  systems: "id",
  elements: "id, systemId",
  interactions: "id, systemId, source, target",
});

db.version(2)
  .stores({
    systems: "id, folder",
    elements: "id, systemId",
    interactions: "id, systemId, source, target",
    snapshots: "id, systemId, createdAt",
  })
  .upgrade(() => {});
