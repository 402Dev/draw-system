import Dexie from "dexie";

export const db = new Dexie("CausalMapperDB");

db.version(1).stores({
  systems: "id",
  elements: "id, systemId",
  interactions: "id, systemId, source, target",
});
