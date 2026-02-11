import { useState, useEffect } from "react";
import "./ImageDetection.css";

function ImageDetection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, violations: 0, safe: 0 });
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("all");
  const [darkMode, setDarkMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem("ppeHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Load dark mode preference
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark-mode");
    }
  }, []);

  useEffect(() => {
    // Auto-hide notification alert after 5 seconds
    if (showNotificationAlert) {
      const timer = setTimeout(() => {
        setShowNotificationAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNotificationAlert]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(selectedFile.type)) {
        alert("Please upload a valid image file (JPEG, PNG, WEBP)");
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const playNotificationSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const uploadImage = async () => {
    if (!file) return alert("Please select an image first");
    
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8001/detect-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process image");
      }

      const data = await res.json();
      setDetections(data.detections);
      
      // Update statistics
      const violations = data.detections.filter(d => 
        d.label.toLowerCase().includes("no") || 
        d.label.toLowerCase().includes("violation")
      ).length;
      
      const newStats = {
        total: data.detections.length,
        violations: violations,
        safe: data.detections.length - violations
      };
      setStats(newStats);

      // Add to history
      const newEntry = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        filename: file.name,
        detections: data.detections.length,
        violations: violations,
        status: violations > 0 ? "⚠️ Violations Found" : "✓ All Clear",
        details: data.detections
      };
      
      const updatedHistory = [newEntry, ...history.slice(0, 19)]; // Keep last 20
      setHistory(updatedHistory);
      localStorage.setItem("ppeHistory", JSON.stringify(updatedHistory));

      // Handle notifications
      if (data.notification_sent && violations > 0) {
        setNotificationMessage(`${violations} violation(s) detected! SMS notification sent.`);
        setShowNotificationAlert(true);
        playNotificationSound();
      } else if (violations > 0) {
        // If backend doesn't send notification status, show based on violations
        setNotificationMessage(`${violations} violation(s) detected! Sending SMS notification...`);
        setShowNotificationAlert(true);
        playNotificationSound();
      }

    } catch (error) {
      console.error("Error:", error);
      alert("Failed to process image. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setDetections([]);
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history?")) {
      setHistory([]);
      localStorage.removeItem("ppeHistory");
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", newMode.toString());
  };

  const exportToJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      statistics: stats,
      currentDetections: detections,
      history: history
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ppe-detection-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Timestamp", "Filename", "Total Detections", "Violations", "Status"],
      ...history.map(h => [h.timestamp, h.filename, h.detections, h.violations, h.status])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ppe-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const getStatusColor = (label) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("no") || lowerLabel.includes("violation")) {
      return "#ef4444";
    }
    return "#10b981";
  };

  const filteredDetections = filter === "all" 
    ? detections 
    : filter === "violations"
    ? detections.filter(d => d.label.toLowerCase().includes("no") || d.label.toLowerCase().includes("violation"))
    : detections.filter(d => !d.label.toLowerCase().includes("no") && !d.label.toLowerCase().includes("violation"));

  return (
    <div className="app-container">
      {/* Notification Alert */}
      {showNotificationAlert && (
        <div className="notification-alert">
          <div className="alert-icon">🚨</div>
          <div className="alert-content">
            <h3>Notification Sent!</h3>
            <p>{notificationMessage}</p>
          </div>
          <button 
            className="alert-close" 
            onClick={() => setShowNotificationAlert(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">🛡️</div>
            <div>
              <h1 className="title">Image Detection</h1>
              <p className="subtitle">PPE Compliance Image Analysis</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
              {darkMode ? "☀️" : "🌙"}
            </button>
            <div className="export-dropdown">
              <button 
                className="icon-btn" 
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="Export Data"
              >
                📥
              </button>
              {showExportMenu && (
                <div className="dropdown-menu">
                  <button onClick={exportToJSON}>Export as JSON</button>
                  <button onClick={exportToCSV}>Export as CSV</button>
                </div>
              )}
            </div>
            <div className="stat-badge">
              <span className="stat-label">System Status</span>
              <span className="stat-value status-active">● Online</span>
            </div>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>📊</div>
            <div className="stat-info">
              <p className="stat-number">{stats.total}</p>
              <p className="stat-text">Total Detections</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>⚠️</div>
            <div className="stat-info">
              <p className="stat-number">{stats.violations}</p>
              <p className="stat-text">Violations Found</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>✓</div>
            <div className="stat-info">
              <p className="stat-number">{stats.safe}</p>
              <p className="stat-text">Compliant Items</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>📈</div>
            <div className="stat-info">
              <p className="stat-number">
                {stats.total > 0 ? Math.round((stats.safe / stats.total) * 100) : 0}%
              </p>
              <p className="stat-text">Compliance Rate</p>
            </div>
          </div>
        </div>

        <div className="content-grid">
          {/* Upload Section */}
          <div className="card upload-card">
            <h2 className="card-title">
              <span>📤</span> Upload Image
            </h2>
            
            <div className="upload-area">
              {preview ? (
                <div className="preview-container">
                  <img src={preview} alt="Preview" className="preview-image" />
                  <button className="remove-btn" onClick={resetForm}>
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <div className="upload-placeholder">
                    <div className="upload-icon">📁</div>
                    <p className="upload-text">Click to upload or drag and drop</p>
                    <p className="upload-subtext">PNG, JPG, JPEG, WEBP (MAX. 10MB)</p>
                  </div>
                </label>
              )}
            </div>

            {file && (
              <div className="file-info">
                <div>
                  <p className="file-name">📄 {file.name}</p>
                  <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <div className="file-type">{file.type.split('/')[1].toUpperCase()}</div>
              </div>
            )}

            <div className="button-group">
              <button
                onClick={uploadImage}
                disabled={!file || loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    🔍 Detect PPE Violations
                  </>
                )}
              </button>
              <button onClick={resetForm} className="btn btn-secondary" disabled={!file}>
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Detection Results */}
          <div className="card results-card">
            <div className="results-header">
              <h2 className="card-title">
                <span>🎯</span> Detection Results
              </h2>
              {detections.length > 0 && (
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${filter === "all" ? "active" : ""}`}
                    onClick={() => setFilter("all")}
                  >
                    All ({detections.length})
                  </button>
                  <button 
                    className={`filter-btn ${filter === "violations" ? "active" : ""}`}
                    onClick={() => setFilter("violations")}
                  >
                    Violations ({stats.violations})
                  </button>
                  <button 
                    className={`filter-btn ${filter === "safe" ? "active" : ""}`}
                    onClick={() => setFilter("safe")}
                  >
                    Safe ({stats.safe})
                  </button>
                </div>
              )}
            </div>
            
            {detections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p className="empty-text">No detections yet</p>
                <p className="empty-subtext">Upload an image to start detecting PPE violations</p>
              </div>
            ) : (
              <div className="detections-list">
                {filteredDetections.length === 0 ? (
                  <div className="empty-state-small">
                    <p>No items in this category</p>
                  </div>
                ) : (
                  filteredDetections.map((d, index) => (
                    <div key={index} className="detection-item">
                      <div className="detection-header">
                        <span 
                          className="detection-label"
                          style={{ color: getStatusColor(d.label) }}
                        >
                          {d.label.replace(/_/g, " ")}
                        </span>
                        <span className="detection-confidence">
                          {(d.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="confidence-bar-container">
                        <div 
                          className="confidence-bar"
                          style={{ 
                            width: `${d.confidence * 100}%`,
                            background: getStatusColor(d.label)
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="card history-card">
            <div className="history-header">
              <h2 className="card-title">
                <span>📋</span> Recent Activity
              </h2>
              <button className="btn-clear-history" onClick={clearHistory}>
                🗑️ Clear History
              </button>
            </div>
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>File</th>
                    <th>Detections</th>
                    <th>Violations</th>
                    <th>Compliance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.id}>
                      <td className="timestamp-cell">{entry.timestamp}</td>
                      <td className="filename-cell">📄 {entry.filename}</td>
                      <td className="center-cell">{entry.detections}</td>
                      <td className="center-cell">
                        <span className={entry.violations > 0 ? "violation-badge" : "safe-badge"}>
                          {entry.violations}
                        </span>
                      </td>
                      <td className="center-cell">
                        {entry.detections > 0 
                          ? Math.round(((entry.detections - entry.violations) / entry.detections) * 100) 
                          : 0}%
                      </td>
                      <td>
                        <span className={entry.violations > 0 ? "status-warning" : "status-success"}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>Safety AI Dashboard v2.0 | Powered by YOLO & FastAPI | Total Scans: {history.length}</p>
      </footer>
    </div>
  );
}

export default ImageDetection;