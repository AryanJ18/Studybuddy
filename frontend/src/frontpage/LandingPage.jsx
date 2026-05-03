import React, { useState, useEffect } from "react";
import Video from "../functions/Video";
import "./LandingPage.css";

export default function FocusLensUI() {
  const [sessionState, setSessionState] = useState("idle"); // 'idle', 'recording', 'summary'
  const [timer, setTimer] = useState(0);
  const [isStopping, setIsStopping] = useState(false);

  // --- DUMMY STATE FOR AI SUMMARY ---
  // You will update this state when window.stopSession() finishes in Video.jsx
  const [sessionInsights, setSessionInsights] = useState({
    focusScore: "--",
    phoneDetections: 0,
    lookAways: 0,
    drowsinessEvents: 0,
    focusedTime: 0,
    totalWastedTime: 0,
    aiInsight: "--",
  });

  // Timer logic
  useEffect(() => {
    let interval;
    if (sessionState === "recording") {
      interval = setInterval(() => {
        setTimer((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [sessionState]);

  const handleStart = () => {
    setSessionState("recording");
    setTimer(0);
    
    // Calls the global function defined in your Video.jsx
    if (window.startSession) {
      window.startSession();
    }
  };

  const handleStop = async () => {
    if (isStopping) return;

    setIsStopping(true);

    // Calls the global function defined in your Video.jsx
    if (window.stopSession) {
      try {
        const finalData = await window.stopSession();

        if (finalData) {
          const focusScore = finalData.totalTime
            ? Math.round((finalData.focusedTime / finalData.totalTime) * 100)
            : 0;

          const backendResponse = finalData.backendResponse;
          const aiInsight = typeof backendResponse === "string"
            ? backendResponse
            : backendResponse?.message || backendResponse?.summary || JSON.stringify(backendResponse ?? {});

          setSessionInsights({
            focusScore: `${focusScore}%`,
            phoneDetections: finalData.phoneCount,
            lookAways: finalData.distractionCount,
            drowsinessEvents: finalData.eyesClosedCount,
            focusedTime: finalData.focusedTime,
            totalWastedTime: finalData.totalWastedTime,
            aiInsight,
          });
        }
      } finally {
        setSessionState("summary");
        setIsStopping(false);
      }
    } else {
      setSessionState("summary");
      setIsStopping(false);
    }
  };

  const resetSession = () => {
    setSessionState("idle");
    setTimer(0);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };



  return (
    <div className="app-container">
      {/* 
        The Video component is mounted so MediaPipe can run, 
        but CSS hides it completely from the user. 
      */}
      <div className="hidden-video-processor">
        <Video />
      </div>

      <header className="app-header">
        <h1>FocusLens</h1>
      </header>

      <main className="app-main">
        
        {/* --- IDLE & RECORDING STATE --- */}
        {sessionState !== "summary" && (
          <div className="tracking-panel">
            <div className="timer-display">{formatTime(timer)}</div>
            
            {sessionState === "recording" && (
              <div className="recording-indicator">
                <span className="pulse-dot"></span>
                Recording Session...
              </div>
            )}

            <div className="controls">
              {sessionState === "idle" ? (
                <button className="btn btn-start" onClick={handleStart}>
                  Start Session
                </button>
              ) : (
                <button className="btn btn-stop" onClick={handleStop} disabled={isStopping}>
                  Stop Session
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- AI SUMMARY STATE --- */}
        {sessionState === "summary" && (
          <div className="summary-panel">
            <h2>AI Session Summary</h2>
            <p className="summary-duration">Total Time: <strong>{formatTime(timer)}</strong></p>

            {/* Easily Addable/Labelled Columns for Video.jsx data */}
            <div className="insights-grid">
              
              <div className="insight-column">
                <span className="insight-label">Estimated Focus</span>
                <span className="insight-value primary-text">
                  {sessionInsights.focusScore}
                </span>
              </div>

              <div className="insight-column">
                <span className="insight-label">Phone Detections</span>
                <span className="insight-value">
                  {sessionInsights.phoneDetections}
                </span>
              </div>

              <div className="insight-column">
                <span className="insight-label">Look-aways</span>
                <span className="insight-value">
                  {sessionInsights.lookAways}
                </span>
              </div>

              <div className="insight-column">
                <span className="insight-label">Drowsiness (Eyes Closed)</span>
                <span className="insight-value">
                  {sessionInsights.drowsinessEvents}
                </span>
              </div>

               <div className="insight-column">
                <span className="insight-label">Time wasted</span>
                <span className="insight-value">
                  {formatTime(Math.floor(sessionInsights.totalWastedTime / 1000))}
                </span>
              </div>

               <div className="insight-column">
                <span className="insight-label">Time foucused</span>
                <span className="insight-value">
                  {formatTime(Math.floor(sessionInsights.focusedTime / 1000))}
                </span>
              </div>

              <div className="insight-column insight-column--wide">
                <span className="insight-label">AI Insight</span>
                <span className="insight-value insight-value--text">
                  {sessionInsights.aiInsight}
                </span>
              </div>

            </div>

            <button className="btn btn-reset" onClick={resetSession}>
              Start New Session
            </button>
          </div>
        )}

      </main>
    </div>
  );
}