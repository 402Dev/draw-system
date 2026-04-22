import { StoreProvider } from "./store";
import Toolbar from "./components/Toolbar";
import Canvas from "./components/Canvas";
import { ReactFlowProvider } from "reactflow";

function App() {
  return (
    <StoreProvider>
      <ReactFlowProvider>
        <div className="app-shell">
          <Toolbar />
          <Canvas />
        </div>
      </ReactFlowProvider>
    </StoreProvider>
  );
}

export default App;
