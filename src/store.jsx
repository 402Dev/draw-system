import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";

const SYSTEM_ID = "default-system";

const initialState = {
  system: { id: SYSTEM_ID, title: "Untitled System", purpose: "" },
  elements: [],
  interactions: [],
  loaded: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return { ...state, ...action.payload, loaded: true };

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

  // Load from IndexedDB on mount
  useEffect(() => {
    async function load() {
      let system = await db.systems.get(SYSTEM_ID);
      if (!system) {
        system = { id: SYSTEM_ID, title: "Untitled System", purpose: "" };
        await db.systems.put(system);
      }
      const elements = await db.elements
        .where("systemId")
        .equals(SYSTEM_ID)
        .toArray();
      const interactions = await db.interactions
        .where("systemId")
        .equals(SYSTEM_ID)
        .toArray();
      dispatch({ type: "LOAD", payload: { system, elements, interactions } });
    }
    load();
  }, []);

  // Persist on every state change (after initial load)
  useEffect(() => {
    if (!state.loaded) return;
    db.systems.put(state.system);
  }, [state.system, state.loaded]);

  useEffect(() => {
    if (!state.loaded) return;
    // Bulk-put is fine for small datasets; we always sync the full set per mutation
  }, [state.elements, state.loaded]);

  useEffect(() => {
    if (!state.loaded) return;
  }, [state.interactions, state.loaded]);

  const actions = {
    updateSystem: useCallback((changes) => {
      dispatch({ type: "UPDATE_SYSTEM", payload: changes });
      db.systems.update(SYSTEM_ID, changes);
    }, []),

    addElement: useCallback((position) => {
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
      dispatch({ type: "DELETE_ELEMENT", payload: { id } });
      db.elements.delete(id);
      db.interactions.where("source").equals(id).delete();
      db.interactions.where("target").equals(id).delete();
    }, []),

    addInteraction: useCallback((connection) => {
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
      dispatch({ type: "DELETE_INTERACTION", payload: { id } });
      db.interactions.delete(id);
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
