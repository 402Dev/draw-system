import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import { applyAutoLayout } from "./utils/autoLayout";

const SYSTEM_ID = "default-system";

const initialState = {
  system: { id: SYSTEM_ID, title: "Untitled System", purpose: "" },
  elements: [],
  interactions: [],
  loaded: false,
  allSystems: [],
  presentationMode: false,
  focusedNodeId: null,
  allSnapshots: [],
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return { ...state, ...action.payload, loaded: true };

    case "SET_ALL_SYSTEMS":
      return { ...state, allSystems: action.payload };

    case "TOGGLE_PRESENTATION":
      return { ...state, presentationMode: !state.presentationMode };

    case "SET_FOCUSED_NODE":
      return { ...state, focusedNodeId: action.payload };

    case "SET_SNAPSHOTS":
      return { ...state, allSnapshots: action.payload };

    case "UPDATE_SYSTEM":
      return { ...state, system: { ...state.system, ...action.payload } };

    case "ADD_ELEMENT": {
      const el = action.payload;
      return { ...state, elements: [...state.elements, el] };
    }

    case "UPDATE_ELEMENT": {
      const { id, changes } = action.payload;
      return {
        ...state,
        elements: state.elements.map((e) =>
          e.id === id
            ? { ...e, ...changes, data: { ...e.data, ...(changes.data || {}) } }
            : e,
        ),
      };
    }

    case "MOVE_ELEMENT": {
      const { id, position } = action.payload;
      return {
        ...state,
        elements: state.elements.map((e) =>
          e.id === id ? { ...e, position } : e,
        ),
      };
    }

    case "DELETE_ELEMENT": {
      const { id } = action.payload;
      return {
        ...state,
        elements: state.elements.filter((e) => e.id !== id),
        interactions: state.interactions.filter(
          (i) => i.source !== id && i.target !== id,
        ),
      };
    }

    case "ADD_INTERACTION": {
      const interaction = action.payload;
      return { ...state, interactions: [...state.interactions, interaction] };
    }

    case "UPDATE_INTERACTION": {
      const { id, changes } = action.payload;
      return {
        ...state,
        interactions: state.interactions.map((i) =>
          i.id === id
            ? { ...i, ...changes, data: { ...i.data, ...(changes.data || {}) } }
            : i,
        ),
      };
    }

    case "DELETE_INTERACTION": {
      const { id } = action.payload;
      return {
        ...state,
        interactions: state.interactions.filter((i) => i.id !== id),
      };
    }

    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Track active system id dynamically for workspace switching
  const activeSystemId = useRef(SYSTEM_ID);
  // History stack: array of {elements, interactions} snapshots
  const historyRef = useRef([]);
  const futureRef = useRef([]);

  // Always-current ref so snapshot() sees live state even inside stale callbacks
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Save a snapshot before a mutating action
  function snapshot() {
    historyRef.current = [
      ...historyRef.current.slice(-49),
      {
        elements: stateRef.current.elements,
        interactions: stateRef.current.interactions,
        system: stateRef.current.system,
      },
    ];
    futureRef.current = [];
  }

  async function loadSystem(systemId) {
    let system = await db.systems.get(systemId);
    if (!system) {
      system = { id: systemId, title: "Untitled System", purpose: "" };
      await db.systems.put(system);
    }
    const elements = await db.elements
      .where("systemId")
      .equals(systemId)
      .toArray();
    const interactions = await db.interactions
      .where("systemId")
      .equals(systemId)
      .toArray();
    const allSystems = await db.systems.toArray();
    activeSystemId.current = systemId;
    historyRef.current = [];
    futureRef.current = [];
    // Persist the last-used workspace so we can restore it on next open
    try {
      localStorage.setItem("causal-mapper:activeSystemId", systemId);
    } catch (_) {}
    dispatch({ type: "LOAD", payload: { system, elements, interactions } });
    dispatch({ type: "SET_ALL_SYSTEMS", payload: allSystems });
  }

  // Load from IndexedDB on mount — restore last-used workspace if available
  useEffect(() => {
    async function init() {
      let savedId = null;
      try {
        savedId = localStorage.getItem("causal-mapper:activeSystemId");
      } catch (_) {}
      // Verify the saved workspace still exists in DB before trusting it
      if (savedId) {
        const exists = await db.systems.get(savedId);
        if (!exists) savedId = null;
      }
      loadSystem(savedId || SYSTEM_ID);
    }
    init();
  }, []);

  // Persist on every state change (after initial load)
  useEffect(() => {
    if (!state.loaded) return;
    db.systems.put(state.system);
  }, [state.system, state.loaded]);

  const actions = {
    togglePresentation: useCallback(() => {
      dispatch({ type: "TOGGLE_PRESENTATION" });
    }, []),

    updateSystem: useCallback((changes) => {
      dispatch({ type: "UPDATE_SYSTEM", payload: changes });
      db.systems.update(SYSTEM_ID, changes);
    }, []),

    addElement: useCallback((position) => {
      snapshot();
      const el = {
        id: uuidv4(),
        systemId: SYSTEM_ID,
        type: "iconNode",
        position,
        data: { label: "New Element", iconName: "Circle", description: "" },
      };
      dispatch({ type: "ADD_ELEMENT", payload: el });
      db.elements.put(el);
      return el;
    }, []),

    addElementRaw: useCallback((el) => {
      snapshot();
      const withSystem = { ...el, systemId: activeSystemId.current };
      dispatch({ type: "ADD_ELEMENT", payload: withSystem });
      db.elements.put(withSystem);
      return withSystem;
    }, []),

    addStickyNote: useCallback((position) => {
      snapshot();
      const el = {
        id: uuidv4(),
        systemId: SYSTEM_ID,
        type: "stickyNote",
        position,
        data: { text: "" },
      };
      dispatch({ type: "ADD_ELEMENT", payload: el });
      db.elements.put(el);
      return el;
    }, []),

    updateElement: useCallback((id, changes) => {
      dispatch({ type: "UPDATE_ELEMENT", payload: { id, changes } });
      db.elements.get(id).then((existing) => {
        if (!existing) return;
        const updated = {
          ...existing,
          ...changes,
          data: { ...existing.data, ...(changes.data || {}) },
        };
        db.elements.put(updated);
      });
    }, []),

    moveElement: useCallback((id, position) => {
      dispatch({ type: "MOVE_ELEMENT", payload: { id, position } });
      db.elements.update(id, { position });
    }, []),

    deleteElement: useCallback((id) => {
      snapshot();
      dispatch({ type: "DELETE_ELEMENT", payload: { id } });
      db.elements.delete(id);
      db.interactions.where("source").equals(id).delete();
      db.interactions.where("target").equals(id).delete();
    }, []),

    addInteraction: useCallback((connection) => {
      snapshot();
      const interaction = {
        id: uuidv4(),
        systemId: SYSTEM_ID,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || null,
        targetHandle: connection.targetHandle || null,
        data: { isBidirectional: false, natureOfInteraction: "" },
      };
      dispatch({ type: "ADD_INTERACTION", payload: interaction });
      db.interactions.put(interaction);
      return interaction;
    }, []),

    updateInteraction: useCallback((id, changes) => {
      snapshot();
      dispatch({ type: "UPDATE_INTERACTION", payload: { id, changes } });
      db.interactions.get(id).then((existing) => {
        if (!existing) return;
        const updated = {
          ...existing,
          ...changes,
          data: { ...existing.data, ...(changes.data || {}) },
        };
        db.interactions.put(updated);
      });
    }, []),

    deleteInteraction: useCallback((id) => {
      snapshot();
      dispatch({ type: "DELETE_INTERACTION", payload: { id } });
      db.interactions.delete(id);
    }, []),

    importState: useCallback(async (json) => {
      const { system, elements, interactions } = json;
      // Wipe and replace DB
      await db.systems.clear();
      await db.elements.clear();
      await db.interactions.clear();
      await db.systems.put(system);
      await db.elements.bulkPut(elements);
      await db.interactions.bulkPut(interactions);
      dispatch({
        type: "LOAD",
        payload: { system, elements, interactions },
      });
    }, []),

    // Expose snapshot so external callers (Canvas drag/resize) can save history
    snapshot: useCallback(() => {
      snapshot();
    }, []),

    undo: useCallback(() => {
      if (historyRef.current.length === 0) return;
      const prev = historyRef.current[historyRef.current.length - 1];
      historyRef.current = historyRef.current.slice(0, -1);
      futureRef.current = [
        {
          elements: stateRef.current.elements,
          interactions: stateRef.current.interactions,
          system: stateRef.current.system,
        },
        ...futureRef.current,
      ];
      dispatch({ type: "LOAD", payload: { ...prev } });
      // Use a transaction so clear+bulkPut is atomic — rapid undo won't corrupt DB
      db.transaction("rw", db.systems, db.elements, db.interactions, () => {
        db.systems.put(prev.system);
        db.elements.clear().then(() => db.elements.bulkPut(prev.elements));
        db.interactions
          .clear()
          .then(() => db.interactions.bulkPut(prev.interactions));
      });
    }, []),

    redo: useCallback(() => {
      if (futureRef.current.length === 0) return;
      const next = futureRef.current[0];
      futureRef.current = futureRef.current.slice(1);
      historyRef.current = [
        ...historyRef.current,
        {
          elements: stateRef.current.elements,
          interactions: stateRef.current.interactions,
          system: stateRef.current.system,
        },
      ];
      dispatch({ type: "LOAD", payload: { ...next } });
      db.transaction("rw", db.systems, db.elements, db.interactions, () => {
        db.systems.put(next.system);
        db.elements.clear().then(() => db.elements.bulkPut(next.elements));
        db.interactions
          .clear()
          .then(() => db.interactions.bulkPut(next.interactions));
      });
    }, []),

    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,

    autoLayout: useCallback(
      (direction = "LR") => {
        snapshot();
        const laid = applyAutoLayout(
          state.elements,
          state.interactions,
          direction,
        );
        laid.forEach((el) => {
          dispatch({
            type: "MOVE_ELEMENT",
            payload: { id: el.id, position: el.position },
          });
          db.elements.update(el.id, { position: el.position });
        });
      },
      [state.elements, state.interactions],
    ),

    createWorkspace: useCallback(async (title) => {
      const id = uuidv4();
      const system = { id, title: title || "New System", purpose: "" };
      await db.systems.put(system);
      await loadSystem(id);
    }, []),

    switchWorkspace: useCallback(async (id) => {
      await loadSystem(id);
    }, []),

    deleteWorkspace: useCallback(
      async (id) => {
        if (state.allSystems.length <= 1) return; // keep at least one
        await db.systems.delete(id);
        await db.elements.where("systemId").equals(id).delete();
        await db.interactions.where("systemId").equals(id).delete();
        const remaining = await db.systems.toArray();
        const nextId = remaining[0]?.id || SYSTEM_ID;
        await loadSystem(nextId);
      },
      [state.allSystems],
    ),

    setWorkspaceFolder: useCallback(async (systemId, folder) => {
      await db.systems.update(systemId, { folder });
      const allSystems = await db.systems.toArray();
      dispatch({ type: "SET_ALL_SYSTEMS", payload: allSystems });
    }, []),

    // Focus/highlight mode
    setFocusedNode: useCallback((id) => {
      dispatch({ type: "SET_FOCUSED_NODE", payload: id });
    }, []),

    // Named snapshots
    saveSnapshot: useCallback(
      async (name) => {
        const snap = {
          id: uuidv4(),
          systemId: activeSystemId.current,
          name,
          createdAt: Date.now(),
          elements: state.elements,
          interactions: state.interactions,
          system: state.system,
        };
        await db.snapshots.put(snap);
        const snaps = await db.snapshots
          .where("systemId")
          .equals(activeSystemId.current)
          .toArray();
        dispatch({ type: "SET_SNAPSHOTS", payload: snaps });
      },
      [state],
    ),

    loadSnapshot: useCallback(async (snap) => {
      snapshot();
      dispatch({
        type: "LOAD",
        payload: {
          elements: snap.elements,
          interactions: snap.interactions,
          system: snap.system,
        },
      });
      await db.elements.clear();
      await db.elements.bulkPut(snap.elements);
      await db.interactions.clear();
      await db.interactions.bulkPut(snap.interactions);
      await db.systems.put(snap.system);
    }, []),

    deleteSnapshot: useCallback(async (id) => {
      await db.snapshots.delete(id);
      const snaps = await db.snapshots
        .where("systemId")
        .equals(activeSystemId.current)
        .toArray();
      dispatch({ type: "SET_SNAPSHOTS", payload: snaps });
    }, []),

    loadSnapshotsForSystem: useCallback(async () => {
      if (!db.snapshots) return;
      const snaps = await db.snapshots
        .where("systemId")
        .equals(activeSystemId.current)
        .toArray();
      dispatch({ type: "SET_SNAPSHOTS", payload: snaps });
    }, []),

    createWorkspaceFromTemplate: useCallback(async (title, template) => {
      const id = uuidv4();
      const system = { id, title: title || "New System", purpose: "" };
      await db.systems.put(system);
      // Create template elements
      if (template && template.elements) {
        const mappedEls = template.elements.map((el) => ({
          ...el,
          id: uuidv4(),
          systemId: id,
        }));
        // Re-map interaction sources/targets using original→new id map
        const idMap = {};
        template.elements.forEach((el, i) => {
          idMap[el.id] = mappedEls[i].id;
        });
        await db.elements.bulkPut(mappedEls);
        if (template.interactions) {
          const mappedIx = template.interactions
            .map((ix) => ({
              ...ix,
              id: uuidv4(),
              systemId: id,
              source: idMap[ix.source],
              target: idMap[ix.target],
            }))
            .filter((ix) => ix.source && ix.target);
          await db.interactions.bulkPut(mappedIx);
        }
      }
      await loadSystem(id);
    }, []),
  };

  return (
    <StoreContext.Provider value={{ state, actions }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
