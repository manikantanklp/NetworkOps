import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Discovery from "./pages/Discovery";
import ConfigPush from "./pages/ConfigPush";
import Analytics from "./pages/Analytics";

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="main-content">
          {/* Header */}
          <header className="header">
            <h1>NetworkOps UI</h1>
            <div className="version">v1.0.0</div>
          </header>

          {/* Main content area */}
          <main className="main">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/discover" element={<Discovery />} />
              <Route path="/config" element={<ConfigPush />} />
              <Route path="/Analytics" element={<Analytics />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
