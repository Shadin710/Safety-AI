import { useState } from "react";
import ImageDetection from "./ImageDetection";
import VideoDetection from "./VideoDetection";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("image");

  return (
    <div className="main-app">
      {/* Navigation */}
      <nav className="navigation">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-icon">🛡️</div>
            <div className="brand-info">
              <h1 className="brand-title">Safety AI Dashboard</h1>
              <p className="brand-subtitle">PPE Compliance Detection System</p>
            </div>
          </div>
          
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === "image" ? "active" : ""}`}
              onClick={() => setActiveTab("image")}
            >
              <div className="tab-content">
                <span className="tab-icon">📸</span>
                <div className="tab-info">
                  <span className="tab-title">Image Detection</span>
                  <span className="tab-description">Analyze single images</span>
                </div>
              </div>
              {activeTab === "image" && <div className="active-indicator"></div>}
            </button>
            
            <button
              className={`nav-tab ${activeTab === "video" ? "active" : ""}`}
              onClick={() => setActiveTab("video")}
            >
              <div className="tab-content">
                <span className="tab-icon">🎥</span>
                <div className="tab-info">
                  <span className="tab-title">Video Detection</span>
                  <span className="tab-description">Process video files</span>
                </div>
              </div>
              {activeTab === "video" && <div className="active-indicator"></div>}
            </button>
          </div>

          <div className="nav-status">
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span className="status-text">Online</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="app-content">
        {activeTab === "image" ? <ImageDetection /> : <VideoDetection />}
      </div>
    </div>
  );
}

export default App;