import { StoreProvider, useStore } from "./store";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import { ReactFlowProvider } from "reactflow";
import { useState } from "react";

function AppInner() {
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <div className="app-shell">
      <Toolbar onSearch={setSearchQuery} />
      <Canvas searchQuery={searchQuery} />
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <ReactFlowProvider>
        <AppInner />
      </ReactFlowProvider>
    </StoreProvider>
  );
}

export default App;
