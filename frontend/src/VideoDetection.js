import { useState, useRef, useEffect, useCallback } from "react";
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
  // const [currentFrame, setCurrentFrame] = useState(0);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);

  const drawBoundingBoxes = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || videoSize.width === 0 || videoSize.height === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const rect = video.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Since backend doesn't send frame numbers, show ALL detections
    const currentFrameDetections = detections;

    if (currentFrameDetections.length === 0) {
      return;
    }

    const scaleX = rect.width / videoSize.width;
    const scaleY = rect.height / videoSize.height;

    currentFrameDetections.forEach((detection, idx) => {
      if (detection.bbox) {
        const bboxArray = Array.isArray(detection.bbox[0]) ? detection.bbox[0] : detection.bbox;
        const [xmax, ymax, xmin, ymin] = bboxArray;
        
        const x = xmin * scaleX;
        const y = ymin * scaleY;
        const width = (xmax - xmin) * scaleX;
        const height = (ymax - ymin) * scaleY;

        const isViolation = detection.label.toLowerCase().includes("no") || 
                          detection.label.toLowerCase().includes("violation");
        const color = isViolation ? '#ef4444' : '#10b981';

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        const label = `${detection.label.replace(/_/g, ' ')} ${(detection.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const textMetrics = ctx.measureText(label);
        const textHeight = 20;
        const padding = 8;

        ctx.fillStyle = color;
        ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding);

        ctx.fillStyle = 'white';
        ctx.fillText(label, x + padding, y - padding);

        const cornerSize = 15;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.moveTo(x, y + cornerSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerSize, y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + cornerSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x, y + height - cornerSize);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + cornerSize, y + height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width, y + height - cornerSize);
        ctx.stroke();
      }
    });
  }, [detections, videoSize]);

  useEffect(() => {
    if (showNotificationAlert) {
      const timer = setTimeout(() => {
        setShowNotificationAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNotificationAlert]);

  useEffect(() => {
    if (detections.length > 0 && videoRef.current && canvasRef.current) {
      // Use requestAnimationFrame for smooth rendering
      const animationId = requestAnimationFrame(() => {
        drawBoundingBoxes();
      });
      return () => cancelAnimationFrame(animationId);
    }
  }, [drawBoundingBoxes, detections.length]);

  useEffect(() => {
    const handleResize = () => {
      if (detections.length > 0) {
        requestAnimationFrame(() => {
          drawBoundingBoxes();
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [detections.length, drawBoundingBoxes]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        alert("File size must be less than 100MB");
        return;
      }

      const validTypes = ["video/mp4", "video/avi", "video/mov", "video/webm"];
      if (!validTypes.includes(selectedFile.type)) {
        alert("Please upload a valid video file (MP4, AVI, MOV, WEBM)");
        return;
      }

      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
      setDetections([]);

      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        const estimatedFrames = Math.floor(video.duration * 30);
        setTotalFrames(estimatedFrames);
        setVideoSize({ width: video.videoWidth, height: video.videoHeight });
      };
    }
  };

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const fps = 30;
      const frame = Math.floor(videoRef.current.currentTime * fps);
      
      // Only update if frame actually changed

    }
  }, []);

  const processVideo = async () => {
    if (!file) return alert("Please select a video first");

    setIsProcessing(true);
    setProcessedFrames(0);
    setDetections([]);
    const startTime = Date.now();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8001/detect-videos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process video");
      }

      const data = await res.json();
      
      console.log('=== Video Processing Complete ===');
      console.log('Response from backend:', data);
      console.log('Total detections received:', data.detections?.length);
      if (data.detections && data.detections.length > 0) {
        console.log('Sample detection:', data.detections[0]);
        console.log('All unique frames:', [...new Set(data.detections.map(d => d.frame))].sort((a, b) => a - b));
      }
      
      setDetections(data.detections || []);
      setProcessedFrames(data.total_frames || 0);
      setTotalFrames(data.total_frames || 0);

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

      const processingTime = (Date.now() - startTime) / 1000;
      setProcessingSpeed(parseFloat((data.total_frames / processingTime).toFixed(2)));

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
    // setCurrentFrame(0);
    setVideoSize({ width: 0, height: 0 });
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

  const uniqueDetections = detections.reduce((acc, detection) => {
    const existing = acc.find(d => d.label === detection.label);
    if (existing) {
      existing.count += 1;
      existing.frames.push(detection.frame);
    } else {
      acc.push({
        ...detection,
        count: 1,
        frames: [detection.frame]
      });
    }
    return acc;
  }, []);

  return (
    <div className="video-detection-container">
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
          <div className="card upload-card">
            <h2 className="card-title">
              <span>📤</span> Upload Video
            </h2>

            <div className="upload-area">
              {preview ? (
                <div className="preview-container">
                  <div className="video-wrapper">
                    <video
                      ref={videoRef}
                      src={preview}
                      controls
                      className="preview-video"
                      onTimeUpdate={handleVideoTimeUpdate}
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          setVideoSize({
                            width: videoRef.current.videoWidth,
                            height: videoRef.current.videoHeight
                          });
                        }
                      }}
                    />
                    <canvas 
                      ref={canvasRef}
                      className="bounding-box-canvas"
                    />
                  </div>
                  {detections.length > 0 && (
                    <div className="detection-legend">
                      <div className="legend-item">
                        <div className="legend-box violation-box"></div>
                        <span>Violations</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-box safe-box"></div>
                        <span>Compliant</span>
                      </div>
                    </div>
                  )}
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
                {uniqueDetections.map((d, index) => (
                  <div key={index} className="detection-item">
                    <div className="detection-header">
                      <div className="detection-label-section">
                        <span 
                          className="detection-label"
                          style={{ color: getStatusColor(d.label) }}
                        >
                          {d.label.replace(/_/g, " ")}
                        </span>
                        <span className="detection-count-badge">
                          {d.count}x
                        </span>
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
                    {d.frames && d.frames.length > 0 && (
                      <div className="frame-info">
                        <span className="frame-icon">🎞️</span>
                        <span className="frame-text">
                          Frames: {d.frames.slice(0, 5).join(', ')}{d.frames.length > 5 ? '...' : ''}
                        </span>
                      </div>
                    )}
                    {d.bbox && (
                      <div className="bbox-info">
                        <span className="bbox-icon">📍</span>
                        <span className="bbox-text">
                          Box: [{(Array.isArray(d.bbox[0]) ? d.bbox[0] : d.bbox).map(v => typeof v === 'number' ? Math.round(v) : v).join(', ')}]
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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