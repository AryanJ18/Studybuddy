import { useRef, useEffect, useState } from "react";
import { FaceLandmarker, FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import { calculateEAR } from "./Ear";
import { detectAttention } from "./Head";
import { updateEvent } from "./Manager";
import { generateSummary } from "./Summary";
import axios from "axios";
import alertSoundFile from "./sound/bep.mp3";

export default function Video(){

  const faceLandmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [events, setEvents] = useState([]);
  const isEyesClosedRef = useRef(false);
  const startTimeRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const frameDeltaRef = useRef(1000 / 30); // 30fps = ~33.33ms per frame
  const sessionStartRef = useRef(null);
  const sessionEndRef = useRef(null);
  const isRunningRef = useRef(false);
  const alertSoundRef = useRef(null);
  const lastAlertAtRef = useRef(0);

  const eyesRef = useRef({ active: false, start: null });
  const phoneRef = useRef({ active: false, start: null });
  const headRef = useRef({ active: false, start: null });
  const ALERT_COOLDOWN_MS = 3000;

  function playAlertSound() {
    const audio = alertSoundRef.current;
    if (!audio) return;

    const now = Date.now();
    if (now - lastAlertAtRef.current < ALERT_COOLDOWN_MS) return;

    lastAlertAtRef.current = now;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Ignore autoplay rejection; session start tries to unlock audio first.
    });
  }

  useEffect(() => {
    const audio = new Audio(alertSoundFile);
    audio.preload = "auto";
    alertSoundRef.current = audio;

    return () => {
      audio.pause();
      alertSoundRef.current = null;
    };
  }, []);

  async function initObjectDetector() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite"
      },
      scoreThreshold: 0.5,
      runningMode: "VIDEO"
    });
  }

  function detectPhone(video) {
    if (!objectDetectorRef.current) return false;

    const result = objectDetectorRef.current.detectForVideo(video, performance.now());

    let phoneDetected = false;

    result.detections.forEach((det) => {
      if (det.categories[0].categoryName === "cell phone") {
        phoneDetected = true;
      }
    });

    return phoneDetected;
  }

  async function init(){
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");

    faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision,
    {
      baseOptions: {
        modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
      },
      runningMode: "VIDEO"
    });
  }

  function loop() {
    if (!isRunningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const currentTime = performance.now();

    if (currentTime - lastFrameTimeRef.current >= frameDeltaRef.current) {
      lastFrameTimeRef.current = currentTime;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const result = faceLandmarkerRef.current.detectForVideo(video,performance.now());
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (result.faceLandmarks.length > 0) {
          const landmarks = result.faceLandmarks[0];

          const leftEyeIndices = [33, 160, 158, 133, 153, 144];
          const leftEye = leftEyeIndices.map(i => landmarks[i]);
          const ear = calculateEAR(leftEye);

          const isEyesClosed = ear < 0.2;
          const attention = detectAttention(landmarks);
          const isLookingAway = attention !== "focused";
          const isPhone = detectPhone(video);
          if (isLookingAway || isPhone) {
            playAlertSound();
          }

          updateEvent(isEyesClosed, eyesRef, "eyes_closed", setEvents);
          updateEvent(isLookingAway, headRef, "looking_away", setEvents);
          updateEvent(isPhone, phoneRef, "phone", setEvents);

          landmarks.forEach((point) => {
            ctx.beginPath();
            ctx.arc(
              point.x * canvas.width,
              point.y * canvas.height,
              2,
              0,
              2 * Math.PI);
            ctx.fill();
          });
        }
      }
    }
    requestAnimationFrame(loop);
  }
  

  async function setUpCamera(){
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    return new Promise((resolve) => {
      videoRef.current.srcObject = stream;

      videoRef.current.onloadeddata = () => {
        resolve();
      };
    });
  }

  useEffect(() => {
    console.log("EVENTS UPDATED:", events);
  }, [events]);


  window.startSession = async () => {
    isRunningRef.current = true;
    sessionStartRef.current = Date.now();

    // User clicked start, so unlock audio once to satisfy browser autoplay policy.
    const audio = alertSoundRef.current;
    if (audio) {
      try {
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // No-op: playback will be attempted again during detection.
      } finally {
        audio.muted = false;
      }
    }

    await setUpCamera();
    await init();
    await initObjectDetector();

    loop();
  };

  window.stopSession = async () => {
    isRunningRef.current = false;
    sessionEndRef.current = Date.now();

    const sessionData = {
      start: sessionStartRef.current,
      end: sessionEndRef.current,
      duration: sessionEndRef.current - sessionStartRef.current,
      events: events
    };

    const summary = generateSummary(sessionData);

    console.log("SUMMARY:", summary);
    

    const res = await axios.post("http://127.0.0.1:8000/report",summary);
    console.log("BACKEND RESPONSE:", res.data);

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  function handleEAR(ear) {
    const now = Date.now();

    // CASE 1: eyes closed → start event
    if (ear < 0.2) {
      if (!isEyesClosedRef.current) {
        isEyesClosedRef.current = true;
        startTimeRef.current = now;
      }
    } 
    // CASE 2: eyes open → end event
    else {
      if (isEyesClosedRef.current) {
        const duration = now - startTimeRef.current;

        if (duration > 500) {
          const event = {
            type: "eyes_closed",
            startTime: startTimeRef.current,
            endTime: now,
            duration: duration
          };

          setEvents(prev => [...prev, event]);
          console.log("Event logged:", event);
        }

        isEyesClosedRef.current = false;
        startTimeRef.current = null;
      }
    }
  }
  
  return (
      <div style={{ position: "relative" }}><video ref={videoRef} autoPlay playsInline style={{ position: "absolute" }}/>
      <canvas ref={canvasRef} style={{ position: "absolute" }}/>
      </div>
    );
}