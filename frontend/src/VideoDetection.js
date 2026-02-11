import { useState, useRef, useEffect } from "react";
import "./VideoDetection.css";

function VideoDetection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState([]);
  const [processedFrames, setProcessedFrames] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, violations: 0, safe: 0 });
  const [processingSpeed, setProcessingSpeed] = useState(0);
  const videoRef = useRef(null);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);

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
      // Validate file size (max 100MB for videos)
      if (selectedFile.size > 100 * 1024 * 1024) {
        alert("File size must be less than 100MB");
        return;
      }

      // Validate file type
      const validTypes = ["video/mp4", "video/avi", "video/mov", "video/webm"];
      if (!validTypes.includes(selectedFile.type)) {
        alert("Please upload a valid video file (MP4, AVI, MOV, WEBM)");
        return;
      }

      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);

      // Get video duration and estimate frames
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        const estimatedFrames = Math.floor(video.duration * 30); // Assuming 30fps
        setTotalFrames(estimatedFrames);
      };
    }
  };

  const processVideo = async () => {
    if (!file) return alert("Please select a video first");

    setIsProcessing(true);
    setProcessedFrames(0);
    setDetections([]);
    const startTime = Date.now();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8001/detect-video", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process video");
      }

      const data = await res.json();
      
      // Process response
      setDetections(data.detections || []);
      setProcessedFrames(data.total_frames || 0);
      setTotalFrames(data.total_frames || 0);

      // Calculate statistics
      const violations = (data.detections || []).filter(d => 
        d.label.toLowerCase().includes("no") || 
        d.label.toLowerCase().includes("violation")
      ).length;

      const newStats = {
        total: data.detections?.length || 0,
        violations: violations,
        safe: (data.detections?.length || 0) - violations
      };
      setStats(newStats);

      // Calculate processing speed
      const processingTime = (Date.now() - startTime) / 1000;
      setProcessingSpeed(parseFloat((data.total_frames / processingTime).toFixed(2)));

      // Handle notifications
      if (data.notifications_sent && violations > 0) {
        const newNotifications = [{
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          message: `${violations} violation(s) detected! SMS notification sent.`,
          type: "warning",
          violations: violations
        }];
        setNotifications(prev => [...newNotifications, ...prev]);
        setShowNotificationAlert(true);

        // Play notification sound (optional)
        playNotificationSound();
      }

    } catch (error) {
      console.error("Error:", error);
      alert("Failed to process video. Please check your connection and try again.");
    } finally {
      setIsProcessing(false);
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

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setDetections([]);
    setProcessedFrames(0);
    setTotalFrames(0);
    setStats({ total: 0, violations: 0, safe: 0 });
    setProcessingSpeed(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getStatusColor = (label) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("no") || lowerLabel.includes("violation")) {
      return "#ef4444";
    }
    return "#10b981";
  };

  const progress = totalFrames > 0 ? (processedFrames / totalFrames) * 100 : 0;

  return (
    <div className="video-detection-container">
      {/* Notification Alert */}
      {showNotificationAlert && (
        <div className="notification-alert">
          <div className="alert-icon">🚨</div>
          <div className="alert-content">
            <h3>Notification Sent!</h3>
            <p>SMS alert has been sent for detected violations</p>
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
      <header className="video-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">🎥</div>
            <div>
              <h1 className="title">Video Detection</h1>
              <p className="subtitle">Real-time PPE Compliance Video Analysis</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-badge">
              <span className="stat-label">Status</span>
              <span className={`stat-value ${isProcessing ? 'status-processing' : 'status-active'}`}>
                ● {isProcessing ? "Processing" : "Ready"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
              🎬
            </div>
            <div className="stat-info">
              <p className="stat-number">{processedFrames}</p>
              <p className="stat-text">Frames Processed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
              ⚠️
            </div>
            <div className="stat-info">
              <p className="stat-number">{stats.violations}</p>
              <p className="stat-text">Violations Found</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              ✓
            </div>
            <div className="stat-info">
              <p className="stat-number">{stats.safe}</p>
              <p className="stat-text">Compliant Items</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              ⚡
            </div>
            <div className="stat-info">
              <p className="stat-number">{processingSpeed}</p>
              <p className="stat-text">FPS Processed</p>
            </div>
          </div>
        </div>

        <div className="content-grid">
          {/* Upload and Preview Section */}
          <div className="card upload-card">
            <h2 className="card-title">
              <span>📤</span> Upload Video
            </h2>

            <div className="upload-area">
              {preview ? (
                <div className="preview-container">
                  <video
                    ref={videoRef}
                    src={preview}
                    controls
                    className="preview-video"
                  />
                  <button className="remove-btn" onClick={resetForm}>
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <label className="upload-label">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <div className="upload-placeholder">
                    <div className="upload-icon">🎬</div>
                    <p className="upload-text">Click to upload or drag and drop</p>
                    <p className="upload-subtext">MP4, AVI, MOV, WEBM (MAX. 100MB)</p>
                  </div>
                </label>
              )}
            </div>

            {file && (
              <div className="file-info">
                <div>
                  <p className="file-name">🎥 {file.name}</p>
                  <p className="file-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <div className="file-type">{file.type.split('/')[1].toUpperCase()}</div>
              </div>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Processing Video...</span>
                  <span className="progress-percentage">{progress.toFixed(1)}%</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="progress-info">
                  Frame {processedFrames} of {totalFrames}
                </p>
              </div>
            )}

            <div className="button-group">
              <button
                onClick={processVideo}
                disabled={!file || isProcessing}
                className="btn btn-primary"
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    🔍 Detect PPE Violations
                  </>
                )}
              </button>
              <button 
                onClick={resetForm} 
                className="btn btn-secondary"
                disabled={isProcessing}
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Detection Results */}
          <div className="card results-card">
            <h2 className="card-title">
              <span>🎯</span> Detection Results
            </h2>

            {detections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎬</div>
                <p className="empty-text">No detections yet</p>
                <p className="empty-subtext">Upload a video to start detecting PPE violations</p>
              </div>
            ) : (
              <div className="detections-list">
                {detections.map((d, index) => (
                  <div key={index} className="detection-item">
                    <div className="detection-header">
                      <div className="detection-label-section">
                        <span 
                          className="detection-label"
                          style={{ color: getStatusColor(d.label) }}
                        >
                          {d.label.replace(/_/g, " ")}
                        </span>
                        {d.frame && (
                          <span className="frame-badge">Frame {d.frame}</span>
                        )}
                      </div>
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <div className="card notifications-card">
            <h2 className="card-title">
              <span>📬</span> Notification History
            </h2>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div key={notification.id} className="notification-item">
                  <div className="notification-icon">
                    {notification.type === "warning" ? "⚠️" : "✓"}
                  </div>
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <p className="notification-time">{notification.timestamp}</p>
                  </div>
                  <button
                    className="notification-dismiss"
                    onClick={() => dismissNotification(notification.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoDetection;